import assert from "node:assert/strict";
import test from "node:test";
import { openStatus } from "./opening-hours.ts";

// 2026-11-02 = Senin, 2026-11-07 = Sabtu, 2026-11-08 = Minggu.
test("openStatus: data kosong atau pola asing → unknown, bukan tebakan", () => {
  assert.equal(openStatus(null, "2026-11-02", "10:00"), "unknown");
  assert.equal(openStatus("sunrise-sunset", "2026-11-02", "10:00"), "unknown");
  assert.equal(openStatus("Mo-Fr 08:00-17:00; Su 22:00-02:00", "2026-11-02", "10:00"), "unknown");
});

test("openStatus: rentang jam dan hari", () => {
  const hours = "Mo-Fr 08:00-17:00; Sa 08:00-12:00";
  assert.equal(openStatus(hours, "2026-11-02", "08:00"), "open");
  assert.equal(openStatus(hours, "2026-11-02", "17:00"), "closed");
  assert.equal(openStatus(hours, "2026-11-02", "7:30"), "closed");
  assert.equal(openStatus(hours, "2026-11-07", "11:59"), "open");
  assert.equal(openStatus(hours, "2026-11-07", "13:00"), "closed");
});

test("openStatus: hari tak disebut = tutup; off, 24/7, jeda siang, tanpa hari, libur diabaikan", () => {
  assert.equal(openStatus("Mo-Fr 08:00-17:00", "2026-11-08", "10:00"), "closed");
  assert.equal(openStatus("Mo-Su 08:00-22:00; Mo off", "2026-11-02", "10:00"), "closed");
  assert.equal(openStatus("24/7", "2026-11-08", "03:00"), "open");
  assert.equal(openStatus("Mo-Fr 08:00-12:00,13:00-17:00", "2026-11-02", "12:30"), "closed");
  assert.equal(openStatus("Mo-Fr 08:00-12:00,13:00-17:00", "2026-11-02", "13:00"), "open");
  assert.equal(openStatus("09:00-21:00", "2026-11-08", "20:00"), "open");
  assert.equal(openStatus("Mo-Su 09:00-21:00; PH off", "2026-11-02", "10:00"), "open");
  assert.equal(openStatus("Sa-Mo 10:00-14:00", "2026-11-02", "11:00"), "open");
});
