import assert from "node:assert/strict";
import test from "node:test";
import { RESULT_TTL_MS, RUNNING_STALE_MS, currentJob, needsRun } from "./plan-job.ts";

const now = 1_000_000_000;
const done = { ok: true, days: [], warnings: [] };
const failed = { ok: false, reason: "invalid" };

test("currentJob: running masih berlaku sampai dianggap macet", () => {
  assert.deepEqual(currentJob({ status: "running", updatedAt: now - 1000 }, now), { status: "running", elapsedMs: 1000 });
  assert.equal(currentJob({ status: "running", updatedAt: now - RUNNING_STALE_MS }, now), null);
  assert.equal(currentJob(undefined, now), null);
});

test("currentJob: hasil sukses kedaluwarsa, hasil gagal tetap ditampilkan", () => {
  const fresh = { status: "finished", result: done, updatedAt: now - 1000 };
  assert.deepEqual(currentJob(fresh, now), { status: "finished", result: done });
  assert.equal(currentJob({ ...fresh, updatedAt: now - RESULT_TTL_MS }, now), null);
  const oldFailure = { status: "finished", result: failed, updatedAt: now - RESULT_TTL_MS * 2 };
  assert.deepEqual(currentJob(oldFailure, now), { status: "finished", result: failed });
});

test("needsRun: jalankan bila tidak ada job berlaku atau hasil gagal, bukan saat running/sukses", () => {
  assert.equal(needsRun(null), true);
  assert.equal(needsRun({ status: "finished", result: failed }), true);
  assert.equal(needsRun({ status: "running" }), false);
  assert.equal(needsRun({ status: "finished", result: done }), false);
});

test("currentJob: hasil sukses tanpa placeId (format lama) dianggap kedaluwarsa agar disusun ulang", () => {
  const stop = (extra) => ({ name: "A", time: "09:00 - 10:00", category: "Wisata", address: "x", note: "", ...extra });
  const job = (placeId) => ({
    status: "finished",
    result: { ok: true, days: [{ title: "H1", stops: [stop({ placeId })] }], warnings: [] },
    updatedAt: now - 1000,
  });
  assert.equal(currentJob(job(undefined), now), null);
  assert.equal(currentJob(job("g1"), now).status, "finished");
});
