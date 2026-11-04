import assert from "node:assert/strict";
import test from "node:test";
import data from "../data/destinations.json" with { type: "json" };
import {
  DESTINATION_ID,
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

test("searchDestinations: nama provinsi menemukan destinasinya, di bawah yang cocok nama", () => {
  const papua = searchDestinations("papua", 100);
  assert.ok(papua.length > 8 && papua.every((d) => d.province.includes("Papua")));
  const bali = searchDestinations("bali", 100);
  assert.ok(bali.some((d) => d.name === "Ubud"));
  assert.ok(bali.findIndex((d) => d.name === "Kota Balikpapan") < bali.findIndex((d) => d.name === "Ubud"));
});

test("searchDestinations: offset melanjutkan daftar tanpa tumpang tindih", () => {
  const all = searchDestinations("an", 30).map((d) => d.id);
  const page2 = searchDestinations("an", 10, 10).map((d) => d.id);
  assert.deepEqual(page2, all.slice(10, 20));
  assert.deepEqual(searchDestinations("an", 10, 100_000), []);
});

test("searchDestinations: huruf besar dan kecil sama hasilnya", () => {
  assert.deepEqual(searchDestinations("PAPUA", 20), searchDestinations("papua", 20));
  assert.deepEqual(searchDestinations("Ubud"), searchDestinations("uBUD"));
});

test("searchDestinations: Jakarta memunculkan 5 kota administrasi", () => {
  const names = searchDestinations("jakarta", 20).map((d) => d.name);
  assert.equal(names.filter((n) => n.startsWith("Jakarta ")).length, 5);
});

test("searchDestinations: kawasan wisata seperti Ubud dan Nusa Dua bisa dicari", () => {
  const ubud = searchDestinations("ubud")[0];
  assert.deepEqual([ubud.name, ubud.kind, ubud.province, ubud.country], ["Ubud", "kawasan", "Bali", "ID"]);
  assert.ok(searchDestinations("nusa dua").some((d) => d.name === "Nusa Dua"));
});

test("searchDestinations: kota yang punya kembaran GeoNames tidak muncul dua kali", () => {
  const names = searchDestinations("malang", 20).map((d) => d.name);
  assert.deepEqual(names.filter((n) => n.replace(/^Kota |^Kabupaten /, "") === "Malang"), ["Kota Malang", "Kabupaten Malang"]);
});

test("data destinasi: id valid dan unik, koordinat lengkap, 514 wilayah Wikidata utuh", () => {
  const ids = new Set(data.map((d) => d.id));
  assert.equal(ids.size, data.length);
  assert.equal(data.filter((d) => d.id.startsWith("Q")).length, 514);
  for (const d of data) {
    assert.match(d.id, DESTINATION_ID);
    assert.ok(d.lat !== null && d.lng !== null, d.name);
    assert.equal(getDestination(d.id)?.name, d.name);
    assert.equal(d.kind === "kawasan", d.id.startsWith("G"), d.name);
  }
});

test("getDestination: id GeoNames (G…) dikenal", () => {
  assert.equal(getDestination("G1622846")?.name, "Ubud");
});

test("getDestination: id dikenal dan tidak dikenal", () => {
  assert.equal(getDestination("Q11445")?.name, "Kota Malang");
  assert.equal(getDestination("Q0"), null);
});
