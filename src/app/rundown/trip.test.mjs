import assert from "node:assert/strict";
import test from "node:test";
import { parseTrip } from "./trip.ts";

const valid = { dest: "Q11445", start: "2026-08-17", end: "2026-08-19" };

test("parseTrip: parameter valid, nama kota dari daftar destinasi", () => {
  const trip = parseTrip({ ...valid, city: "Palsu" });
  assert.equal(trip?.city, "Kota Malang");
  assert.equal(trip?.start, valid.start);
  assert.equal(trip?.end, valid.end);
});

test("parseTrip: id kawasan GeoNames (G…) diterima dan namanya dari daftar", () => {
  assert.equal(parseTrip({ ...valid, dest: "G1622846" })?.city, "Ubud");
  assert.equal(parseTrip({ ...valid, dest: "G0" }), null);
  assert.equal(parseTrip({ ...valid, dest: "g1622846" }), null);
});

test("parseTrip: tanggal satu hari dan tepat batas maksimum diterima", () => {
  assert.ok(parseTrip({ ...valid, end: valid.start }));
  assert.ok(parseTrip({ ...valid, end: "2026-08-21" })); // 5 hari
});

test("parseTrip: lewat batas maksimum hari ditolak", () => {
  assert.equal(parseTrip({ ...valid, end: "2026-08-22" }), null);
});

test("parseTrip: parameter hilang atau bertipe salah ditolak", () => {
  for (const key of ["dest", "start", "end"]) {
    assert.equal(parseTrip({ ...valid, [key]: undefined }), null, key);
    assert.equal(parseTrip({ ...valid, [key]: ["x"] }), null, key);
  }
  assert.equal(parseTrip({}), null);
});

test("parseTrip: dest tidak dikenal atau berformat salah ditolak", () => {
  assert.equal(parseTrip({ ...valid, dest: "Q0" }), null);
  assert.equal(parseTrip({ ...valid, dest: "malang" }), null);
  assert.equal(parseTrip({ ...valid, dest: "Q11445x" }), null);
});

test("parseTrip: tanggal rusak, tidak ada di kalender, atau terbalik ditolak", () => {
  assert.equal(parseTrip({ ...valid, start: "17-08-2026" }), null);
  assert.equal(parseTrip({ ...valid, start: "2026-02-30" }), null);
  assert.equal(parseTrip({ ...valid, end: "2026-13-01" }), null);
  assert.equal(parseTrip({ ...valid, start: "2026-08-19", end: "2026-08-17" }), null);
});

test("parseTrip: seed numerik dipakai; selain itu diturunkan stabil dari perjalanan", () => {
  assert.equal(parseTrip({ ...valid, seed: "42" })?.seed, 42);
  const a = parseTrip({ ...valid, seed: "abc" })?.seed;
  const b = parseTrip({ ...valid })?.seed;
  assert.equal(typeof a, "number");
  assert.equal(a, b);
  assert.notEqual(a, parseTrip({ ...valid, end: "2026-08-18" })?.seed);
  assert.equal(parseTrip({ ...valid, seed: "12345678901" })?.seed, b); // 11 digit ditolak
});
