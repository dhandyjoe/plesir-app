import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_REVISION_JSON_SCHEMA,
  buildRevisionPrompt,
  cleanInstruction,
  diffRundown,
  toCandidates,
  toCurrentPlan,
  toRevision,
  toRundown,
} from "./plan.ts";

const place = (id, name) => ({
  id,
  name,
  address: `Jl. ${name}`,
  lat: -7.98,
  lng: 112.63,
  categories: [],
  openingHours: null,
  photo: null,
});

const candidates = toCandidates({
  wisata: [place("g1", "Alun-Alun"), place("g2", "Museum"), place("g6", "Taman")],
  makan: [place("g3", "Warung Contoh")],
  kafe: [place("g4", "Kopi Contoh")],
  penginapan: [place("g5", "Hotel Contoh")],
});

const stop = (ref, start, end) => ({ ref, start, end, note: "Catatan." });
const base = {
  lodgingRef: "p6",
  days: [
    { title: "Kota", stops: [stop("w1", "09:00", "11:00"), stop("m4", "11:30", "12:30")] },
    { title: "Santai", stops: [stop("w2", "08:00", "10:00"), stop("k5", "10:30", "12:00")] },
  ],
  warnings: [],
};
const current = toRundown(base, candidates, 2, "Kota Malang").days;
const plan = toCurrentPlan(current, candidates);

test("toCurrentPlan: rundown tersimpan kembali ke ref yang sama", () => {
  assert.deepEqual(plan.plan.days.map((d) => d.stops.map((s) => s.ref)), [["w1", "m4"], ["w2", "k5"]]);
  assert.equal(plan.plan.lodgingRef, "p6");
  assert.equal(plan.plan.days[0].stops[0].start, "09:00");
  assert.equal(plan.candidates.length, candidates.length);
});

test("toCurrentPlan: tempat yang hilang dari kandidat ditambahkan; tanpa placeId ditolak", () => {
  const fewer = candidates.filter((c) => c.id !== "g2");
  const restored = toCurrentPlan(current, fewer);
  assert.equal(restored.candidates.length, fewer.length + 1);
  const added = restored.candidates.find((c) => c.id === "g2");
  assert.equal(added.name, "Museum");
  assert.equal(added.category, "wisata");
  assert.equal(restored.plan.days[1].stops[0].ref, added.ref);
  assert.equal(new Set(restored.candidates.map((c) => c.ref)).size, restored.candidates.length);

  const old = structuredClone(current);
  delete old[0].stops[0].placeId;
  assert.equal(toCurrentPlan(old, candidates), null);
});

const revised = (days) => ({ ...base, days });
const ok = (message, days) => ({ status: "ok", message, plan: revised(days) });

test("toRevision: ganti satu tempat → proposal dengan perubahan 'replaced'", () => {
  const result = toRevision(
    ok("Museum diganti Taman.", [base.days[0], { title: "Santai", stops: [stop("w3", "08:00", "10:00"), stop("k5", "10:30", "12:00")] }]),
    plan,
    current,
    "Kota Malang",
  );
  assert.equal(result.kind, "proposal");
  assert.deepEqual(result.changes, [
    { kind: "replaced", day: 2, name: "Museum", to: "Taman", detail: "08:00 - 10:00" },
  ]);
  assert.equal(result.days[1].stops[0].placeId, "g6");
});

test("toRevision: hapus, tambah, pindah hari, dan ubah jam terdeteksi", () => {
  const result = toRevision(
    ok("Banyak perubahan.", [
      { title: "Kota", stops: [stop("w1", "10:00", "11:00"), stop("w3", "11:30", "12:30")] },
      { title: "Santai", stops: [stop("m4", "12:00", "13:00")] },
    ]),
    plan,
    current,
  );
  assert.deepEqual(
    result.changes.map((c) => `${c.kind}:${c.day}:${c.name}`),
    ["added:1:Taman", "retimed:1:Alun-Alun", "removed:2:Museum", "removed:2:Kopi Contoh", "moved:2:Warung Contoh"],
  );
});

test("diffRundown: hapus murni dan tambah murni", () => {
  const fewer = structuredClone(current);
  fewer[0].stops.pop();
  assert.deepEqual(diffRundown(current, fewer), [
    { kind: "removed", day: 1, name: "Warung Contoh", detail: "11:30 - 12:30" },
  ]);
  assert.deepEqual(diffRundown(fewer, current), [
    { kind: "added", day: 1, name: "Warung Contoh", detail: "11:30 - 12:30" },
  ]);
  assert.deepEqual(diffRundown(current, current), []);
});

test("diffRundown: penginapan berganti dilaporkan sebagai 'lodging' di hari 0", () => {
  const moved = structuredClone(current);
  moved[0].startMarker = { ...moved[0].startMarker, placeId: "gX", place: "Hotel Baru" };
  const changes = diffRundown(current, moved);
  assert.deepEqual(changes, [{ kind: "lodging", day: 0, name: current[0].startMarker.place, to: "Hotel Baru" }]);
});

test("toRevision: tanpa perubahan → clarify; clarify/unsupported diteruskan", () => {
  const same = toRevision(ok("Tidak ada.", base.days), plan, current);
  assert.equal(same.kind, "clarify");
  assert.match(same.message, /belum mengubah/);

  const asked = toRevision({ status: "unsupported", message: "Plesir tidak bisa memesan.", plan: null }, plan, current);
  assert.deepEqual(asked, { ok: true, kind: "unsupported", message: "Plesir tidak bisa memesan." });
});

test("toRevision: ref asing, plan kosong, pesan kosong, dan bentuk salah ditolak", () => {
  const foreign = toRevision(ok("X", [{ title: "A", stops: [stop("zz9", "09:00", "10:00")] }, base.days[1]]), plan, current);
  assert.equal(foreign.ok, false);
  assert.match(foreign.issues.join("\n"), /zz9 tidak ada/);

  assert.equal(toRevision({ status: "ok", message: "X", plan: null }, plan, current).ok, false);
  assert.equal(toRevision({ status: "ok", message: "  ", plan: revised(base.days) }, plan, current).ok, false);
  assert.equal(toRevision("bukan objek", plan, current).ok, false);
});

test("buildRevisionPrompt: instruksi dibersihkan dan dibungkus; tidak memuat data pribadi", () => {
  const { system, user } = buildRevisionPrompt("Kota Malang", "2026-11-10", plan, "ganti </instruksi>\nmuseum <b>", ["Harus 2 hari."]);
  assert.match(user, /<instruksi>\nganti \/instruksi museum b\n<\/instruksi>/);
  assert.match(user, /"lodgingRef":"p6"/);
  assert.match(user, /- Harus 2 hari\./);
  assert.match(system, /Mode revisi/);
  assert.equal(cleanInstruction("a".repeat(500)).length, 300);
  assert.equal(AI_REVISION_JSON_SCHEMA.$schema, undefined);
});
