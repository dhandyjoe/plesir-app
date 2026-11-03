import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  addMonths,
  addMonthsKeepDay,
  formatDate,
  formatDateRange,
  formatDayLabel,
  formatMonth,
  localDateString,
  monthCells,
  monthStart,
  parseDateKey,
  rangeInDays,
  tripPhase,
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

test("tripPhase: hitung mundur, hari pertama dan terakhir dianggap berjalan", () => {
  assert.deepEqual(tripPhase("2026-11-12", "2026-11-14", "2026-11-02"), { kind: "upcoming", days: 10 });
  assert.deepEqual(tripPhase("2026-11-12", "2026-11-14", "2026-11-11"), { kind: "upcoming", days: 1 });
  assert.deepEqual(tripPhase("2026-11-12", "2026-11-14", "2026-11-12"), { kind: "ongoing" });
  assert.deepEqual(tripPhase("2026-11-12", "2026-11-14", "2026-11-14"), { kind: "ongoing" });
  assert.deepEqual(tripPhase("2026-11-12", "2026-11-14", "2026-11-15"), { kind: "past" });
  assert.deepEqual(tripPhase("2026-12-30", "2027-01-01", "2026-11-30"), { kind: "upcoming", days: 30 });
});

test("localDateString / parseDateKey: bolak-balik tanpa bergeser zona waktu", () => {
  assert.equal(localDateString(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(localDateString(parseDateKey("2026-12-31")), "2026-12-31");
  const date = parseDateKey("2026-03-09");
  assert.deepEqual([date.getFullYear(), date.getMonth(), date.getDate()], [2026, 2, 9]);
});

test("monthStart: tanggal 1 pada bulan yang sama", () => {
  assert.equal(monthStart("2026-07-23"), "2026-07-01");
});

test("monthCells: Minggu = 6 sel kosong, jumlah hari Februari kabisat", () => {
  assert.equal(monthCells("2026-02-01").leading, 6);
  const feb = monthCells("2028-02-10");
  assert.equal(feb.days.length, 29);
  assert.equal(feb.days[0], "2028-02-01");
  assert.equal(feb.days.at(-1), "2028-02-29");
});

test("addDays: offset negatif dan nol", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-03-01", 0), "2026-03-01");
});

test("rangeInDays: satu hari bila awal = akhir", () => {
  assert.equal(rangeInDays("2026-05-10", "2026-05-10"), 1);
});

test("format tanggal: locale id-ID", () => {
  assert.match(formatDate("2026-08-17"), /^17 Agu(s)?\.? 2026$/);
  assert.equal(formatMonth("2026-08-01"), "Agustus 2026");
  assert.equal(formatDayLabel("2026-08-17"), "Senin, 17 Agustus 2026");
  assert.equal(formatDateRange("2026-08-17", ""), formatDate("2026-08-17"));
  assert.equal(
    formatDateRange("2026-08-17", "2026-08-19"),
    `${formatDate("2026-08-17")} – ${formatDate("2026-08-19")}`,
  );
});
