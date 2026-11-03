import assert from "node:assert/strict";
import test from "node:test";
import { formatLeg, toMatrix } from "./route.ts";

const cell = (distance, time) => ({ distance, time, source_index: 0, target_index: 0 });

test("toMatrix: satu sumber → daftar per target; sel tanpa rute jadi null", () => {
  const out = toMatrix({ sources_to_targets: [[cell(3200, 540), cell(null, null), cell(900, 120)]] }, 3);
  assert.deepEqual(out, [{ meters: 3200, seconds: 540 }, null, { meters: 900, seconds: 120 }]);
});

test("toMatrix: jumlah target tidak cocok atau bentuk salah ditolak", () => {
  assert.equal(toMatrix({ sources_to_targets: [[cell(1, 1)]] }, 2), null);
  assert.equal(toMatrix({ sources_to_targets: [] }, 1), null);
  assert.equal(toMatrix({ error: "Unauthorized" }, 1), null);
  assert.equal(toMatrix(null, 1), null);
});

test("toMatrix: sel rusak menjadi null tanpa menggagalkan sel lain", () => {
  assert.deepEqual(toMatrix({ sources_to_targets: [["x", cell(500, 60)]] }, 2), [null, { meters: 500, seconds: 60 }]);
});

test("formatLeg: meter, km berkoma desimal, menit, jam", () => {
  assert.equal(formatLeg({ meters: 854, seconds: 150 }), "0,85 km • 3 mnt");
  assert.equal(formatLeg({ meters: 3200, seconds: 540 }), "3,2 km • 9 mnt");
  assert.equal(formatLeg({ meters: 42000, seconds: 3900 }), "42 km • 1 j 5 mnt");
  assert.equal(formatLeg({ meters: 80000, seconds: 7200 }), "80 km • 2 j");
  assert.equal(formatLeg({ meters: 50, seconds: 10 }), "0,05 km • 1 mnt");
});
