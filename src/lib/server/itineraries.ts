import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import {
  ITINERARY_TTL_MS,
  MAX_SAVED,
  applyProposal,
  canStartRevision,
  isExpired,
  ownedBy,
  saveDoc,
  startRevisionDoc,
  toSummary,
  toView,
  undoRevision,
  type ItineraryDoc,
  type ItinerarySummary,
  type ItineraryView,
} from "@/lib/itinerary";
import { db } from "./firestore";
import { getPlanJob } from "./plan-jobs";
import { revisePlan } from "./revise";

type Trip = { dest: string; city: string; start: string; end: string };

const itineraryRef = (id: string) => db().doc(`itineraries/${id}`);
/** Untuk TTL policy Firestore (opsional, diatur di console); tanpa policy, dokumen lama hanya diabaikan. */
const expiresAt = (now: number) => Timestamp.fromMillis(now + ITINERARY_TTL_MS);
/** Firestore menolak `undefined` (mis. alamat penginapan kosong); JSON roundtrip membuangnya. */
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** `set` tanpa merge: rundown tersimpan ditulis tanpa expiresAt sehingga tidak dihapus TTL policy. */
const write = (doc: ItineraryDoc) => (doc.saved ? clean(doc) : { ...clean(doc), expiresAt: expiresAt(doc.updatedAt) });

const savedQuery = (uid: string) =>
  db().collection("itineraries").where("ownerUid", "==", uid).where("saved", "==", true);

/** Rundown tersimpan milik `uid`, terakhir diubah lebih dulu. */
export async function listSaved(uid: string): Promise<ItinerarySummary[]> {
  // shortcut: membaca dokumen utuh (days) hanya untuk ringkasan; maks MAX_SAVED dokumen, pindah ke field ringkasan bila daftar terasa lambat.
  const snapshot = await savedQuery(uid).limit(MAX_SAVED).get();
  return snapshot.docs
    .map((doc) => toSummary(doc.id, doc.data() as ItineraryDoc))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Batas jumlah tersimpan; dicek di luar transaksi, jadi dua simpan bersamaan bisa melewati batas satu kali. */
const savedFull = async (uid: string) => (await savedQuery(uid).count().get()).data().count >= MAX_SAVED;

/** Bukan pemilik diperlakukan sama dengan tidak ada (404) agar keberadaan dokumen tidak bocor. */
const visible = (doc: ItineraryDoc | undefined, uid: string, now: number): doc is ItineraryDoc =>
  !!doc && ownedBy(doc, uid) && !isExpired(doc, now);

export async function getItinerary(id: string, uid: string): Promise<ItineraryView | null> {
  const doc = (await itineraryRef(id).get()).data() as ItineraryDoc | undefined;
  const now = Date.now();
  return visible(doc, uid, now) ? toView(id, doc, now) : null;
}

/**
 * Salin hasil job yang sudah sukses menjadi itinerary milik `uid`. Null bila job belum sukses atau memakai data lama tanpa placeId
 * (rencana disusun sebelum fitur revisi ada), karena revisi butuh placeId untuk mencocokkan kandidat.
 * shortcut: pembuatan belum dibatasi per pengguna (hanya revisi per rencana yang dibatasi), tambahkan rate limit per uid sebelum rilis publik.
 */
export async function createItinerary(
  trip: Trip,
  uid: string,
  save = false,
): Promise<ItineraryView | null | "limit_saved"> {
  const job = await getPlanJob(trip);
  if (job?.status !== "finished" || !job.result.ok) return null;
  const { days, warnings } = job.result;
  if (!days.every((day) => day.stops.every((stop) => stop.placeId))) return null;
  if (save && (await savedFull(uid))) return "limit_saved";

  const now = Date.now();
  const id = crypto.randomUUID();
  const doc: ItineraryDoc = {
    ownerUid: uid,
    ...(save ? { saved: true } : {}),
    dest: trip.dest,
    city: trip.city,
    start: trip.start,
    end: trip.end,
    days,
    warnings,
    version: 1,
    history: [],
    revision: null,
    revisionDay: "",
    revisionCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await itineraryRef(id).set(write(doc));
  return toView(id, doc, now);
}

export type StartResult = { ok: true } | { ok: false; reason: "not_found" | "stale" | "busy" | "limit" };

/** Transaksi memastikan satu revisi berjalan sekali; pekerjaan AI berjalan di `after()` dan klien memantau lewat getItinerary. */
export async function startRevision(id: string, uid: string, instruction: string, expectedVersion: number): Promise<StartResult> {
  const ref = itineraryRef(id);
  const now = Date.now();
  const requestId = crypto.randomUUID();
  const result = await db().runTransaction(async (tx): Promise<StartResult> => {
    const doc = (await tx.get(ref)).data() as ItineraryDoc | undefined;
    if (!visible(doc, uid, now)) return { ok: false, reason: "not_found" };
    if (doc.version !== expectedVersion) return { ok: false, reason: "stale" };
    const allowed = canStartRevision(doc, now);
    if (allowed !== "ok") return { ok: false, reason: allowed };
    tx.set(ref, write(startRevisionDoc(doc, requestId, now)));
    return { ok: true };
  });
  if (result.ok) after(() => runRevision(id, requestId, instruction));
  return result;
}

async function runRevision(id: string, requestId: string, instruction: string) {
  const ref = itineraryRef(id);
  try {
    const doc = (await ref.get()).data() as ItineraryDoc | undefined;
    if (doc?.revision?.status !== "running" || doc.revision.requestId !== requestId) return;
    const outcome = await revisePlan(doc, instruction);

    // Simpan hanya bila revisi ini masih yang aktif (Undo atau revisi lain bisa menggantikannya selama AI bekerja).
    await db().runTransaction(async (tx) => {
      const latest = (await tx.get(ref)).data() as ItineraryDoc | undefined;
      if (latest?.revision?.status !== "running" || latest.revision.requestId !== requestId) return;
      const now = Date.now();
      tx.set(ref, write({ ...latest, revision: { status: "finished", requestId, outcome }, updatedAt: now }));
    });
  } catch (error) {
    // Bila penyimpanan gagal, revisi tetap "running" lalu dianggap macet setelah REVISION_STALE_MS dan bisa diulang.
    console.error("itineraries: revisi gagal disimpan", error);
  }
}

export type MutateResult =
  | { ok: true; view: ItineraryView }
  | { ok: false; reason: "not_found" | "stale" | "no_proposal" | "no_history" | "limit_saved" };

async function mutate(
  id: string,
  uid: string,
  change: (doc: ItineraryDoc, now: number) => ReturnType<typeof applyProposal>,
): Promise<MutateResult> {
  const ref = itineraryRef(id);
  const now = Date.now();
  return db().runTransaction(async (tx): Promise<MutateResult> => {
    const doc = (await tx.get(ref)).data() as ItineraryDoc | undefined;
    if (!visible(doc, uid, now)) return { ok: false, reason: "not_found" };
    const next = change(doc, now);
    if (!next.ok) return next;
    tx.set(ref, write(next.doc));
    return { ok: true, view: toView(id, next.doc, now) };
  });
}

export const applyRevision = (id: string, uid: string, proposalId: string, expectedVersion: number) =>
  mutate(id, uid, (doc, now) => applyProposal(doc, proposalId, expectedVersion, now));

export const undoLastRevision = (id: string, uid: string, expectedVersion: number) =>
  mutate(id, uid, (doc, now) => undoRevision(doc, expectedVersion, now));

export async function saveItinerary(id: string, uid: string): Promise<MutateResult> {
  if (await savedFull(uid)) {
    // Yang sudah tersimpan tetap boleh "disimpan" lagi (tombol ditekan dua kali) tanpa kena batas.
    const current = await getItinerary(id, uid);
    if (!current) return { ok: false, reason: "not_found" };
    if (!current.saved) return { ok: false, reason: "limit_saved" };
  }
  return mutate(id, uid, (doc, now) => saveDoc(doc, now));
}

/** false bila tidak ada atau bukan milik `uid` (dibalas 404 yang sama). */
export async function deleteItinerary(id: string, uid: string): Promise<boolean> {
  const ref = itineraryRef(id);
  return db().runTransaction(async (tx) => {
    const doc = (await tx.get(ref)).data() as ItineraryDoc | undefined;
    if (!visible(doc, uid, Date.now())) return false;
    tx.delete(ref);
    return true;
  });
}
