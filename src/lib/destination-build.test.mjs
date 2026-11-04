import assert from "node:assert/strict";
import test from "node:test";
import { mergeDestinations, parseGeonamesRow, selectCandidates } from "./destination-build.ts";

// id, name, ascii, alt, lat, lng, class, code, cc, cc2, admin1, admin2, admin3, admin4, population
const line = (over = {}) => {
  const f = ["1", "Ubud", "Ubud", "", "-8.5069", "115.2625", "P", "PPL", "ID", "", "02", "", "", "", "74800"];
  for (const [i, v] of Object.entries(over)) f[i] = v;
  return f.join("\t");
};

const kota = { id: "Q11445", name: "Kota Malang", province: "Jawa Timur", kind: "kota", country: "ID", lat: -7.98, lng: 112.63 };
const row = (over = {}) => ({ id: "9", name: "Ubud", lat: -8.5069, lng: 115.2625, country: "ID", admin1: "02", population: 74800, ...over });
const provinces = new Map([["ID.02", "Bali"], ["ID.08", "Jawa Timur"]]);

test("parseGeonamesRow: baris valid dipetakan ke kolom yang benar", () => {
  assert.deepEqual(parseGeonamesRow(line()), {
    id: "1", name: "Ubud", lat: -8.5069, lng: 115.2625, country: "ID", admin1: "02", population: 74800,
  });
});

test("parseGeonamesRow: bagian kota, historis, koordinat kosong, dan baris pendek ditolak", () => {
  assert.equal(parseGeonamesRow(line({ 7: "PPLX" })), null);
  assert.equal(parseGeonamesRow(line({ 7: "PPLH" })), null);
  assert.equal(parseGeonamesRow(line({ 6: "A", 7: "ADM2" })), null);
  assert.equal(parseGeonamesRow(line({ 4: "" })), null);
  assert.equal(parseGeonamesRow(line({ 4: "91" })), null);
  assert.equal(parseGeonamesRow("1\tUbud"), null);
});

test("parseGeonamesRow: populasi kosong jadi 0", () => {
  assert.equal(parseGeonamesRow(line({ 14: "" }))?.population, 0);
});

test("selectCandidates: populasi cukup, atau Wikivoyage, dan hanya negara aktif", () => {
  const rows = [
    row({ id: "1", population: 5000 }),
    row({ id: "2", population: 4999 }),
    row({ id: "3", population: 0 }),
    row({ id: "4", population: 90000, country: "TH" }),
  ];
  const ids = selectCandidates(rows, new Set(["3"]), ["ID"]).map((r) => r.id);
  assert.deepEqual(ids, ["1", "3"]);
});

test("mergeDestinations: kawasan baru ditambahkan di belakang baris lama tanpa mengubahnya", () => {
  const { rows, added } = mergeDestinations([kota], [row()], new Map(), provinces);
  assert.equal(rows[0], kota);
  assert.deepEqual(added, [
    { id: "G9", name: "Ubud", province: "Bali", kind: "kawasan", country: "ID", lat: -8.507, lng: 115.263 },
  ]);
});

test("mergeDestinations: nama sama dengan wilayah lama dilewati, juga beda spasi atau awalan", () => {
  const legacy = [{ ...kota, name: "Kota Tebing Tinggi", province: "Sumatera Utara" }];
  const p = new Map([["ID.26", "Sumatera Utara"]]);
  const { added, skipped } = mergeDestinations(legacy, [row({ name: "Tebingtinggi", admin1: "26" })], new Map(), p);
  assert.equal(added.length, 0);
  assert.match(skipped[0], /nama ganda/);
});

test("mergeDestinations: nama sama di provinsi lain tetap masuk", () => {
  const { added } = mergeDestinations([kota], [row({ name: "Malang", admin1: "02" })], new Map(), provinces);
  assert.equal(added.length, 1);
});

test("mergeDestinations: tautan Wikidata ke wilayah lama dilewati walau namanya beda", () => {
  const links = new Map([["9", "Q11445"]]);
  const { added, skipped } = mergeDestinations([kota], [row({ admin1: "08" })], links, provinces);
  assert.equal(added.length, 0);
  assert.match(skipped[0], /Q11445/);
});

test("mergeDestinations: kandidat ganda mempertahankan yang berpopulasi terbesar", () => {
  const small = row({ id: "1", population: 100 });
  const big = row({ id: "2", population: 9000 });
  const { added } = mergeDestinations([], [small, big], new Map(), provinces);
  assert.deepEqual(added.map((d) => d.id), ["G2"]);
});

test("mergeDestinations: provinsi tidak dikenal dilewati dan dilaporkan", () => {
  const { added, skipped } = mergeDestinations([], [row({ admin1: "99" })], new Map(), provinces);
  assert.equal(added.length, 0);
  assert.match(skipped[0], /ID\.99/);
});
