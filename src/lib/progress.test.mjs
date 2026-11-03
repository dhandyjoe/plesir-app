import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ESTIMATE, estimateProgress, stageAt } from "./progress.ts";

test("estimateProgress: mulai dari 0, naik terus, tidak pernah melewati batas", () => {
  assert.equal(estimateProgress(0, 120_000), 0);
  assert.equal(estimateProgress(-5000, 120_000), 0);
  assert.equal(estimateProgress(Number.NaN, 120_000), 0);
  let previous = 0;
  for (let t = 1000; t <= 600_000; t += 1000) {
    const value = estimateProgress(t, 120_000);
    assert.ok(value >= previous && value <= MAX_ESTIMATE);
    previous = value;
  }
  assert.equal(estimateProgress(600_000, 120_000), MAX_ESTIMATE);
});

test("stageAt: memilih tahap terakhir yang batasnya terlewati", () => {
  const stages = [
    { from: 0, label: "a" },
    { from: 10, label: "b" },
    { from: 70, label: "c" },
  ];
  assert.equal(stageAt(0, stages), "a");
  assert.equal(stageAt(9, stages), "a");
  assert.equal(stageAt(10, stages), "b");
  assert.equal(stageAt(95, stages), "c");
});
