import assert from "node:assert/strict";
import test from "node:test";
import {
  getDestination,
  normalize,
  searchDestinations,
} from "./destinations.ts";

test("normalize: awalan jenis wilayah dan diakritik dibuang", () => {
  assert.equal(normalize("  Kota   Malang "), "malang");
  assert.equal(normalize("Kab. Malang"), "malang");
  assert.equal(normalize("Kabupaten Malang"), "malang");
  assert.equal(normalize("Yogyakarta"), "yogyakarta");
});

test("searchDestinations: kota lebih dulu dari kabupaten pada nama sama", () => {
  const names = searchDestinations("malang").map((d) => d.name);
  assert.deepEqual(names.slice(0, 2), ["Kota Malang", "Kabupaten Malang"]);
});

test("searchDestinations: awalan nama di atas yang hanya mengandung", () => {
  const names = searchDestinations("ban").map((d) => d.name);
  assert.ok(names.slice(0, 3).every((n) => normalize(n).startsWith("ban")));
});

test("searchDestinations: query pendek atau tanpa hasil → kosong; limit dihormati", () => {
  assert.deepEqual(searchDestinations("a"), []);
  assert.deepEqual(searchDestinations("xyzxyz"), []);
  assert.ok(searchDestinations("ka", 3).length <= 3);
});

test("searchDestinations: Jakarta memunculkan 5 kota administrasi", () => {
  const names = searchDestinations("jakarta", 20).map((d) => d.name);
  assert.equal(names.filter((n) => n.startsWith("Jakarta ")).length, 5);
});

test("getDestination: id dikenal dan tidak dikenal", () => {
  assert.equal(getDestination("Q11445")?.name, "Kota Malang");
  assert.equal(getDestination("Q0"), null);
});
