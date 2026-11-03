import type { Change } from "./plan";
import type { PhotoCredit, RundownDay } from "./rundown";

export type RevisionOutcome =
  | {
      kind: "proposal";
      proposalId: string;
      /** Versi itinerary saat usulan dibuat; usulan hanya berlaku untuk versi ini. */
      baseVersion: number;
      days: RundownDay[];
      warnings: string[];
      summary: string;
      changes: Change[];
    }
  | { kind: "clarify" | "unsupported"; message: string }
  | { kind: "error"; reason: "quota" | "unavailable" | "invalid"; resetAt?: string };

export type RevisionState =
  | { status: "running"; requestId: string; startedAt: number }
  | { status: "finished"; requestId: string; outcome: RevisionOutcome };

/** Bentuk dokumen `itineraries/{id}` di Firestore (server saja). Firestore melarang array bersarang, jadi riwayat dibungkus objek. */
export type ItineraryDoc = {
  /** UID Firebase pemilik; dokumen lama tanpa field ini tidak dimiliki siapa pun. */
  ownerUid?: string;
  /** Disimpan lewat tombol Simpan Rundown: tampil di Rundown Tersimpan dan tidak kedaluwarsa. */
  saved?: boolean;
  dest: string;
  city: string;
  start: string;
  end: string;
  days: RundownDay[];
  warnings: string[];
  version: number;
  history: { days: RundownDay[] }[];
  revision: RevisionState | null;
  /** Hari kalender WIB (YYYY-MM-DD) dan jumlah revisi yang dimulai hari itu, untuk batas per rencana. */
  revisionDay: string;
  revisionCount: number;
  createdAt: number;
  updatedAt: number;
};

/** Yang dikirim ke klien: tanpa requestId/riwayat mentah. */
export type ItineraryView = {
  id: string;
  version: number;
  dest: string;
  saved: boolean;
  city: string;
  start: string;
  end: string;
  days: RundownDay[];
  warnings: string[];
  canUndo: boolean;
  revision: { status: "running"; elapsedMs: number } | { status: "finished"; outcome: RevisionOutcome } | null;
};

/** Berapa langkah Undo yang tersimpan. */
export const MAX_HISTORY = 5;
/** Batas revisi per rencana per hari; kuota Gemini global tetap dijaga reserveQuota. */
export const MAX_REVISIONS_PER_DAY = 20;
/** Lebih lama dari 2 panggilan Gemini (2 × 150 dtk); revisi "running" setua ini dianggap macet (mis. server restart). */
export const REVISION_STALE_MS = 6 * 60_000;
/** Rencana yang tak disentuh selama ini diabaikan (dan bisa dihapus lewat TTL policy Firestore). */
export const ITINERARY_TTL_MS = 30 * 24 * 60 * 60_000;
/** Batas rundown tersimpan per akun; yang tersimpan tidak kedaluwarsa, jadi jumlahnya perlu dibatasi. */
export const MAX_SAVED = 30;

/** Hari kalender WIB (UTC+7, tanpa DST) sebagai YYYY-MM-DD. */
export const wibDay = (now: number) => new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);

export const ownedBy = (doc: Pick<ItineraryDoc, "ownerUid">, uid: string) => !!uid && doc.ownerUid === uid;

export const isExpired = (doc: Pick<ItineraryDoc, "updatedAt" | "saved">, now: number) =>
  !doc.saved && now - doc.updatedAt >= ITINERARY_TTL_MS;

/** Tandai tersimpan; isi rundown tidak berubah, jadi versi tetap (usulan revisi yang menunggu tetap berlaku). */
export const saveDoc = (doc: ItineraryDoc, now: number): Transition => ({
  ok: true,
  doc: { ...doc, saved: true, updatedAt: now },
});

export function canStartRevision(doc: ItineraryDoc, now: number): "ok" | "busy" | "limit" {
  const { revision } = doc;
  if (revision?.status === "running" && now - revision.startedAt < REVISION_STALE_MS) return "busy";
  const count = doc.revisionDay === wibDay(now) ? doc.revisionCount : 0;
  return count >= MAX_REVISIONS_PER_DAY ? "limit" : "ok";
}

/** Dokumen sesudah revisi dimulai; hitungan harian di-reset saat ganti hari. */
export function startRevisionDoc(doc: ItineraryDoc, requestId: string, now: number): ItineraryDoc {
  const day = wibDay(now);
  return {
    ...doc,
    revision: { status: "running", requestId, startedAt: now },
    revisionDay: day,
    revisionCount: (doc.revisionDay === day ? doc.revisionCount : 0) + 1,
    updatedAt: now,
  };
}

export type Transition =
  | { ok: true; doc: ItineraryDoc }
  | { ok: false; reason: "stale" | "no_proposal" | "no_history" };

/** Terapkan usulan: hanya bila versi dan proposalId cocok. Rundown lama masuk riwayat untuk Undo. */
export function applyProposal(
  doc: ItineraryDoc,
  proposalId: string,
  expectedVersion: number,
  now: number,
): Transition {
  if (doc.version !== expectedVersion) return { ok: false, reason: "stale" };
  const outcome = doc.revision?.status === "finished" ? doc.revision.outcome : null;
  if (outcome?.kind !== "proposal" || outcome.proposalId !== proposalId || outcome.baseVersion !== doc.version) {
    return { ok: false, reason: "no_proposal" };
  }
  return {
    ok: true,
    doc: {
      ...doc,
      days: outcome.days,
      warnings: [...new Set([...doc.warnings, ...outcome.warnings])].slice(0, 8),
      history: [{ days: doc.days }, ...doc.history].slice(0, MAX_HISTORY),
      version: doc.version + 1,
      revision: null,
      updatedAt: now,
    },
  };
}

export function undoRevision(doc: ItineraryDoc, expectedVersion: number, now: number): Transition {
  if (doc.version !== expectedVersion) return { ok: false, reason: "stale" };
  const [previous, ...history] = doc.history;
  if (!previous) return { ok: false, reason: "no_history" };
  return {
    ok: true,
    doc: { ...doc, days: previous.days, history, version: doc.version + 1, revision: null, updatedAt: now },
  };
}

export function toView(id: string, doc: ItineraryDoc, now: number): ItineraryView {
  const { revision } = doc;
  const stale = revision?.status === "running" && now - revision.startedAt >= REVISION_STALE_MS;
  return {
    id,
    version: doc.version,
    dest: doc.dest,
    saved: !!doc.saved,
    city: doc.city,
    start: doc.start,
    end: doc.end,
    days: doc.days,
    warnings: doc.warnings,
    canUndo: doc.history.length > 0,
    // Revisi macet disembunyikan agar klien berhenti menunggu; revisi baru boleh dimulai (lihat canStartRevision).
    revision:
      !revision || stale
        ? null
        : revision.status === "running"
          ? { status: "running", elapsedMs: now - revision.startedAt }
          : { status: "finished", outcome: revision.outcome },
  };
}

/** Satu kartu di Rundown Tersimpan: cukup untuk membuka rundownnya lagi, tanpa isi jadwal lengkap. */
export type ItinerarySummary = {
  id: string;
  dest: string;
  city: string;
  start: string;
  end: string;
  /** Jumlah tempat per hari, berurutan. */
  stopsPerDay: number[];
  updatedAt: number;
  /** Foto Commons pertama di rundown; hanya yang punya atribusi (wajib untuk lisensi CC). */
  cover?: { src: string; credit: PhotoCredit };
};

export function toSummary(id: string, doc: ItineraryDoc): ItinerarySummary {
  const stop = doc.days.flatMap((day) => day.stops).find((s) => s.photo && s.photoCredit);
  return {
    id,
    dest: doc.dest,
    city: doc.city,
    start: doc.start,
    end: doc.end,
    stopsPerDay: doc.days.map((day) => day.stops.length),
    updatedAt: doc.updatedAt,
    ...(stop?.photo && stop.photoCredit ? { cover: { src: stop.photo, credit: stop.photoCredit } } : {}),
  };
}
