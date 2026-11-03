import assert from "node:assert/strict";
import test from "node:test";
import { quotaDay, quotaResetAt } from "./quota.ts";

test("quotaDay: hari dihitung UTC, bukan WIB", () => {
  // 06:59 WIB tanggal 2 = 23:59 UTC tanggal 1 → masih kuota tanggal 1.
  assert.equal(quotaDay(new Date("2026-11-01T23:59:59Z")), "2026-11-01");
  assert.equal(quotaDay(new Date("2026-11-02T00:00:00Z")), "2026-11-02");
});

test("quotaResetAt: tengah malam UTC berikutnya, termasuk lintas bulan dan tahun", () => {
  assert.equal(
    quotaResetAt(new Date("2026-11-30T15:00:00Z")).toISOString(),
    "2026-12-01T00:00:00.000Z",
  );
  assert.equal(
    quotaResetAt(new Date("2026-12-31T23:59:59Z")).toISOString(),
    "2027-01-01T00:00:00.000Z",
  );
});
