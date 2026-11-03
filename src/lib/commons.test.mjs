import assert from "node:assert/strict";
import test from "node:test";
import { toCommonsPhotos, toWikidataImages } from "./commons.ts";

test("toWikidataImages: ambil P18, lewati entitas tanpa P18", () => {
  const out = toWikidataImages({
    entities: {
      Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: "Candi Prambanan.jpg" } } }] } },
      Q2: { claims: {} },
      Q3: { claims: { P18: [{ mainsnak: {} }] } },
      Q4: {},
    },
  });
  assert.deepEqual(out, { Q1: "Candi Prambanan.jpg" });
});

test("toWikidataImages: respons rusak → kosong", () => {
  assert.deepEqual(toWikidataImages({ error: "x" }), {});
  assert.deepEqual(toWikidataImages(null), {});
});

const page = (title, info) => ({ title, imageinfo: info ? [info] : undefined });
const info = (extra = {}) => ({
  thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/A.jpg/640px-A.jpg",
  descriptionurl: "https://commons.wikimedia.org/wiki/File:A.jpg",
  extmetadata: { Artist: { value: "Budi" }, LicenseShortName: { value: "CC BY-SA 4.0" } },
  ...extra,
});

test("toCommonsPhotos: petakan foto, buang HTML pada penulis", () => {
  const out = toCommonsPhotos({
    query: {
      pages: [
        page("File:A.jpg", info({ extmetadata: { Artist: { value: '<a href="x">Budi &amp; Ani</a>' }, LicenseShortName: { value: "CC0" } } })),
      ],
    },
  });
  assert.deepEqual(out, {
    "A.jpg": {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/A.jpg/640px-A.jpg",
      author: "Budi & Ani",
      license: "CC0",
      source: "https://commons.wikimedia.org/wiki/File:A.jpg",
    },
  });
});

test("toCommonsPhotos: penulis kosong, penulis panjang, tanpa lisensi, host asing, file hilang", () => {
  const out = toCommonsPhotos({
    query: {
      pages: [
        page("File:Kosong.jpg", info({ extmetadata: { LicenseShortName: { value: "CC0" } } })),
        page("File:Panjang.jpg", info({ extmetadata: { Artist: { value: "x".repeat(200) }, LicenseShortName: { value: "CC0" } } })),
        page("File:TanpaLisensi.jpg", info({ extmetadata: { Artist: { value: "Budi" } } })),
        page("File:Asing.jpg", info({ thumburl: "https://evil.example/a.jpg" })),
        page("File:Hilang.jpg", null),
      ],
    },
  });
  assert.equal(out["Kosong.jpg"].author, "Tidak diketahui");
  assert.equal(out["Panjang.jpg"].author.length, 80);
  assert.deepEqual(Object.keys(out).sort(), ["Kosong.jpg", "Panjang.jpg"]);
});

test("toCommonsPhotos: thumbnail dari thumb.wikimedia.org (bentuk respons asli) diterima", () => {
  const thumburl = "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/A.jpg/960px-A.jpg?utm_source=commons.wikimedia.org";
  assert.equal(
    toCommonsPhotos({ query: { pages: [page("File:A.jpg", info({ thumburl }))] } })["A.jpg"].url,
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/A.jpg/960px-A.jpg",
  );
});

test("toCommonsPhotos: respons rusak → kosong", () => {
  assert.deepEqual(toCommonsPhotos({ query: {} }), {});
});

test("toCommonsPhotos: thumbnail bukan URL valid dibuang, bukan throw", () => {
  const out = toCommonsPhotos({ query: { pages: [page("File:A.jpg", info({ thumburl: "bukan url" }))] } });
  assert.deepEqual(out, {});
});
