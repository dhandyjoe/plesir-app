import assert from "node:assert/strict";
import test from "node:test";
import { toPlaces } from "./geoapify.ts";

const feature = (properties) => ({ type: "Feature", properties });

test("toPlaces: memetakan field dan membuang tempat tanpa nama/koordinat", () => {
  const places = toPlaces({
    type: "FeatureCollection",
    features: [
      feature({
        place_id: "a1",
        name: "Kopi Contoh",
        formatted: "Jl. Contoh 1, Malang",
        lat: -7.98,
        lon: 112.63,
        categories: ["catering", "catering.cafe"],
        datasource: { raw: { opening_hours: "Mo-Su 08:00-22:00" } },
      }),
      feature({ place_id: "b2", lat: -7.9, lon: 112.6 }),
      feature({ place_id: "c3", name: "Tanpa Koordinat" }),
      feature({ place_id: "d4", name: "Minimal", lat: -7.9, lon: 112.6 }),
    ],
  });

  assert.deepEqual(places, [
    {
      id: "a1",
      name: "Kopi Contoh",
      address: "Jl. Contoh 1, Malang",
      lat: -7.98,
      lng: 112.63,
      categories: ["catering", "catering.cafe"],
      openingHours: "Mo-Su 08:00-22:00",
      photo: null,
    },
    {
      id: "d4",
      name: "Minimal",
      address: null,
      lat: -7.9,
      lng: 112.6,
      categories: [],
      openingHours: null,
      photo: null,
    },
  ]);
});

const photoOf = (raw) =>
  toPlaces({
    features: [feature({ place_id: "p", name: "P", lat: 1, lon: 2, datasource: { raw } })],
  })[0].photo;

test("toPlaces: rujukan foto hanya dari tag Wikimedia", () => {
  assert.deepEqual(photoOf({ wikimedia_commons: "File:Candi_Prambanan.jpg" }), { commons: "Candi Prambanan.jpg" });
  assert.equal(photoOf({ wikimedia_commons: "Category:Candi Prambanan" }), null);
  assert.deepEqual(
    photoOf({ image: "https://commons.wikimedia.org/wiki/File:Tugu%20Jogja.jpg" }),
    { commons: "Tugu Jogja.jpg" },
  );
  assert.equal(photoOf({ image: "https://example.com/foto.jpg" }), null);
  assert.deepEqual(photoOf({ wikidata: "Q12345" }), { wikidata: "Q12345" });
  assert.equal(photoOf({ wikidata: "bukan-qid" }), null);
  assert.deepEqual(photoOf({ wikimedia_commons: "File:A.jpg", wikidata: "Q1" }), { commons: "A.jpg" });
  assert.equal(photoOf({}), null);
});

test("toPlaces: respons tanpa features ditolak", () => {
  assert.throws(() => toPlaces({ error: "Unauthorized" }));
});

test("toPlaces: tag Commons dengan persen-encoding rusak diabaikan, bukan throw", () => {
  assert.equal(photoOf({ wikimedia_commons: "File:%E0%A4%A.jpg" }), null);
  assert.deepEqual(photoOf({ wikimedia_commons: "File:%E0%A4%A.jpg", wikidata: "Q1" }), { wikidata: "Q1" });
});
