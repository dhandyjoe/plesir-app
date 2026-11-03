import assert from "node:assert/strict";
import test from "node:test";
import {
  ITINERARY_TTL_MS,
  MAX_HISTORY,
  MAX_REVISIONS_PER_DAY,
  REVISION_STALE_MS,
  applyProposal,
  canStartRevision,
  isExpired,
  ownedBy,
  saveDoc,
  startRevisionDoc,
  toSummary,
  toView,
  undoRevision,
  wibDay,
} from "./itinerary.ts";

const NOW = Date.parse("2026-11-10T10:00:00Z");
const day = (title) => ({ title, startMarker: { place: "H" }, finishMarker: { place: "H" }, stops: [] });
const doc = (extra = {}) => ({
  dest: "Q1",
  city: "Kota Malang",
  start: "2026-11-10",
  end: "2026-11-10",
  days: [day("lama")],
  warnings: ["a"],
  version: 3,
  history: [],
  revision: null,
  revisionDay: "",
  revisionCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...extra,
});
const proposal = (extra = {}) => ({
  status: "finished",
  requestId: "r1",
  outcome: { kind: "proposal", proposalId: "p1", baseVersion: 3, days: [day("baru")], warnings: ["a", "b"], summary: "x", changes: [], ...extra },
});

test("wibDay: pergantian hari mengikuti WIB, bukan UTC", () => {
  assert.equal(wibDay(Date.parse("2026-11-10T16:59:00Z")), "2026-11-10");
  assert.equal(wibDay(Date.parse("2026-11-10T17:00:00Z")), "2026-11-11");
});

test("canStartRevision: sibuk, macet boleh diulang, dan batas harian", () => {
  const running = (startedAt) => doc({ revision: { status: "running", requestId: "r", startedAt } });
  assert.equal(canStartRevision(doc(), NOW), "ok");
  assert.equal(canStartRevision(running(NOW - 1000), NOW), "busy");
  assert.equal(canStartRevision(running(NOW - REVISION_STALE_MS), NOW), "ok");
  const full = doc({ revisionDay: wibDay(NOW), revisionCount: MAX_REVISIONS_PER_DAY });
  assert.equal(canStartRevision(full, NOW), "limit");
  assert.equal(canStartRevision(full, NOW + 24 * 3_600_000), "ok");
});

test("startRevisionDoc: hitungan harian naik dan di-reset saat ganti hari", () => {
  const first = startRevisionDoc(doc(), "r1", NOW);
  assert.deepEqual([first.revisionDay, first.revisionCount, first.revision.status], ["2026-11-10", 1, "running"]);
  assert.equal(startRevisionDoc(first, "r2", NOW).revisionCount, 2);
  assert.equal(startRevisionDoc(first, "r3", NOW + 24 * 3_600_000).revisionCount, 1);
});

test("applyProposal: menerapkan usulan, menyimpan riwayat, menaikkan versi", () => {
  const result = applyProposal(doc({ revision: proposal() }), "p1", 3, NOW + 1);
  assert.equal(result.ok, true);
  assert.equal(result.doc.days[0].title, "baru");
  assert.equal(result.doc.version, 4);
  assert.equal(result.doc.revision, null);
  assert.equal(result.doc.history[0].days[0].title, "lama");
  assert.deepEqual(result.doc.warnings, ["a", "b"]);
});

test("applyProposal: menolak versi usang, proposalId salah, usulan basi, dan tanpa usulan", () => {
  const withProposal = doc({ revision: proposal() });
  assert.deepEqual(applyProposal(withProposal, "p1", 2, NOW), { ok: false, reason: "stale" });
  assert.deepEqual(applyProposal(withProposal, "zz", 3, NOW), { ok: false, reason: "no_proposal" });
  assert.deepEqual(applyProposal(doc({ revision: proposal({ baseVersion: 2 }) }), "p1", 3, NOW), { ok: false, reason: "no_proposal" });
  assert.deepEqual(applyProposal(doc(), "p1", 3, NOW), { ok: false, reason: "no_proposal" });
  assert.deepEqual(
    applyProposal(doc({ revision: { status: "finished", requestId: "r", outcome: { kind: "clarify", message: "?" } } }), "p1", 3, NOW),
    { ok: false, reason: "no_proposal" },
  );
});

test("riwayat dibatasi MAX_HISTORY; undo mengembalikan rundown sebelumnya", () => {
  let current = doc();
  for (let i = 0; i < MAX_HISTORY + 2; i++) {
    current = { ...current, revision: proposal({ baseVersion: current.version, days: [day(`v${i}`)] }) };
    current = applyProposal(current, "p1", current.version, NOW).doc;
  }
  assert.equal(current.history.length, MAX_HISTORY);
  const undone = undoRevision(current, current.version, NOW);
  assert.equal(undone.ok, true);
  assert.equal(undone.doc.days[0].title, `v${MAX_HISTORY}`);
  assert.equal(undone.doc.history.length, MAX_HISTORY - 1);
  assert.deepEqual(undoRevision(doc(), 3, NOW), { ok: false, reason: "no_history" });
  assert.deepEqual(undoRevision(current, 0, NOW), { ok: false, reason: "stale" });
});

test("toView: tanpa requestId/riwayat; revisi macet disembunyikan", () => {
  const view = toView("id1", doc({ revision: proposal(), history: [{ days: [] }] }), NOW);
  assert.equal(view.canUndo, true);
  assert.equal(view.revision.outcome.kind, "proposal");
  assert.equal("requestId" in view.revision, false);
  assert.equal("history" in view, false);
  const stale = doc({ revision: { status: "running", requestId: "r", startedAt: NOW - REVISION_STALE_MS } });
  assert.equal(toView("id1", stale, NOW).revision, null);
  assert.deepEqual(toView("id1", doc({ revision: { status: "running", requestId: "r", startedAt: NOW - 2500 } }), NOW).revision, { status: "running", elapsedMs: 2500 });
});

test("ownedBy: hanya pemilik; dokumen lama tanpa ownerUid dan uid kosong ditolak", () => {
  assert.equal(ownedBy(doc({ ownerUid: "u1" }), "u1"), true);
  assert.equal(ownedBy(doc({ ownerUid: "u1" }), "u2"), false);
  assert.equal(ownedBy(doc(), "u1"), false);
  assert.equal(ownedBy(doc(), ""), false);
});

test("isExpired: draf kedaluwarsa setelah TTL, yang tersimpan tidak", () => {
  const later = NOW + ITINERARY_TTL_MS;
  assert.equal(isExpired(doc(), later - 1), false);
  assert.equal(isExpired(doc(), later), true);
  assert.equal(isExpired(doc({ saved: true }), later * 2), false);
});

test("saveDoc: menandai tersimpan tanpa menaikkan versi; revisi berikutnya tetap tersimpan", () => {
  const saved = saveDoc(doc({ revision: proposal() }), NOW + 5).doc;
  assert.deepEqual([saved.saved, saved.version, saved.updatedAt], [true, 3, NOW + 5]);
  const applied = applyProposal(saved, "p1", 3, NOW + 6).doc;
  assert.equal(applied.saved, true);
  assert.equal(undoRevision(applied, applied.version, NOW + 7).doc.saved, true);
  assert.equal(toView("id1", saved, NOW).saved, true);
  assert.equal(toView("id1", doc(), NOW).saved, false);
});

test("toSummary: jumlah tempat per hari dan sampul hanya dari foto beratribusi", () => {
  const credit = { author: "A", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/x" };
  const stop = (extra = {}) => ({ time: "08:00", name: "S", category: "c", address: "a", note: "n", ...extra });
  const days = [
    { ...day("1"), stops: [stop({ photo: "mock.jpg" }), stop()] },
    { ...day("2"), stops: [stop(), stop({ photo: "a.jpg", photoCredit: credit }), stop()] },
  ];
  const summary = toSummary("id1", doc({ days }));
  assert.deepEqual(summary.stopsPerDay, [2, 3]);
  assert.deepEqual(summary.cover, { src: "a.jpg", credit });
  assert.equal("days" in summary, false);
  assert.equal("cover" in toSummary("id1", doc()), false);
});
