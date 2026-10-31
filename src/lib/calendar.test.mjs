import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  addMonths,
  addMonthsKeepDay,
  monthCells,
  rangeInDays,
} from "./calendar.ts";

test("monthCells: Senin awal minggu", () => {
  assert.equal(monthCells("2026-10-01").leading, 3); // 1 Okt 2026 = Kamis
  assert.equal(monthCells("2026-10-01").days.length, 31);
  assert.equal(monthCells("2026-11-01").leading, 6); // 1 Nov 2026 = Minggu
  assert.equal(monthCells("2026-02-01").days.length, 28);
});

test("addMonths / addDays lintas bulan dan tahun", () => {
  assert.equal(addMonths("2026-12-01", 1), "2027-01-01");
  assert.equal(addMonths("2026-01-01", -1), "2025-12-01");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("addMonthsKeepDay menjepit ke akhir bulan", () => {
  assert.equal(addMonthsKeepDay("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsKeepDay("2026-10-15", -1), "2026-09-15");
});

test("rangeInDays inklusif", () => {
  assert.equal(rangeInDays("2026-10-31", "2026-11-03"), 4);
  assert.equal(rangeInDays("2026-10-31", "2026-10-31"), 1);
});
