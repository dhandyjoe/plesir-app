import assert from "node:assert/strict";
import test from "node:test";
import { shouldFallback, withFallback } from "./model-fallback.ts";

const ok = (value) => ({ done: true, value });
const limited = { done: false };

test("withFallback: model utama dipakai bila ada kuota dan tidak ditolak", async () => {
  const called = [];
  const result = await withFallback(["a", "b"], async () => true, async (m) => (called.push(m), ok(m)));
  assert.deepEqual(result, ok("a"));
  assert.deepEqual(called, ["a"]);
});

test("withFallback: pindah ke model berikutnya saat kuota internal habis, tanpa memanggil model itu", async () => {
  const called = [];
  const result = await withFallback(["a", "b"], async (m) => m !== "a", async (m) => (called.push(m), ok(m)));
  assert.deepEqual(result, ok("b"));
  assert.deepEqual(called, ["b"]);
});

test("withFallback: pindah saat provider menolak karena limit (429)", async () => {
  const result = await withFallback(["a", "b"], async () => true, async (m) => (m === "a" ? limited : ok(m)));
  assert.deepEqual(result, ok("b"));
});

test("withFallback: semua model habis atau ditolak → done:false", async () => {
  assert.deepEqual(await withFallback(["a", "b"], async () => false, async () => ok("x")), limited);
  assert.deepEqual(await withFallback(["a", "b"], async () => true, async () => limited), limited);
  assert.deepEqual(await withFallback([], async () => true, async () => ok("x")), limited);
});

test("withFallback: kegagalan selain limit (hasil null) dikembalikan, tidak memicu pindah", async () => {
  const called = [];
  const result = await withFallback(["a", "b"], async () => true, async (m) => (called.push(m), ok(null)));
  assert.deepEqual(result, ok(null));
  assert.deepEqual(called, ["a"]);
});

test("shouldFallback: limit, 5xx, dan timeout memicu pindah model", () => {
  for (const status of [429, 500, 502, 503, 504]) assert.equal(shouldFallback({ status }), true, String(status));
  assert.equal(shouldFallback({ error: new DOMException("t", "TimeoutError") }), true);
});

test("shouldFallback: request/respons rusak tidak memicu pindah model", () => {
  for (const status of [400, 403, 404]) assert.equal(shouldFallback({ status }), false, String(status));
  assert.equal(shouldFallback({ error: new SyntaxError("JSON rusak") }), false);
  assert.equal(shouldFallback({ error: new DOMException("dibatalkan", "AbortError") }), false);
  assert.equal(shouldFallback({ error: "TimeoutError" }), false);
});
