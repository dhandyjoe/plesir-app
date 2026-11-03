import assert from "node:assert/strict";
import test from "node:test";
import { carryOver } from "./enrich.ts";

const credit = { author: "Budi", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:A.jpg" };
const stop = (placeId, extra = {}) => ({ placeId, time: "09:00 - 10:00", name: placeId, category: "Wisata", address: "x", note: "", ...extra });
const day = (lodging, stops, marker = {}) => {
  const base = { placeId: lodging, place: lodging, ...marker };
  return { title: "Hari 1", startMarker: base, finishMarker: base, stops };
};

const leg = { meters: 100, seconds: 60 };

test("carryOver: foto dan ruas stop yang sama ikut terbawa bila titik sebelumnya sama", () => {
  const previous = [day("h1", [stop("a", { photo: "u", photoCredit: credit, fromPrev: leg })])];
  const [out] = carryOver([day("h1", [stop("a"), stop("b")])], previous);
  assert.deepEqual(out.stops[0].photo, "u");
  assert.deepEqual(out.stops[0].photoCredit, credit);
  assert.deepEqual(out.stops[0].fromPrev, leg);
  assert.equal(out.stops[1].photo, undefined);
});

test("carryOver: titik sebelumnya berganti → ruas tidak dibawa, foto tetap", () => {
  const previous = [day("h1", [stop("a", { photo: "u", photoCredit: credit, fromPrev: leg })])];
  const [byLodging] = carryOver([day("h2", [stop("a")])], previous);
  assert.equal(byLodging.stops[0].photo, "u");
  assert.equal(byLodging.stops[0].fromPrev, undefined);

  const two = [day("h1", [stop("x"), stop("a", { fromPrev: leg })])];
  const [byStop] = carryOver([day("h1", [stop("y"), stop("a")])], two);
  assert.equal(byStop.stops[1].fromPrev, undefined);
});

test("carryOver: ruas pulang ikut hanya bila stop terakhir dan penginapan sama", () => {
  const previous = [day("h1", [stop("a")])];
  previous[0].finishMarker = { placeId: "h1", place: "h1", fromPrev: leg };
  assert.deepEqual(carryOver([day("h1", [stop("a")])], previous)[0].finishMarker.fromPrev, leg);
  assert.equal(carryOver([day("h1", [stop("b")])], previous)[0].finishMarker.fromPrev, undefined);
});

test("carryOver: tidak menimpa field yang sudah ada; foto penginapan ikut bila sama", () => {
  const previous = [day("h1", [stop("a", { photo: "lama" })], { photo: "hotel", photoCredit: credit })];
  const [out] = carryOver([day("h1", [stop("a", { photo: "baru" })])], previous);
  assert.equal(out.stops[0].photo, "baru");
  assert.equal(out.startMarker.photo, "hotel");
  assert.equal(out.finishMarker.photoCredit, credit);
});

test("carryOver: tanpa placeId tidak dicocokkan dan input tidak dimutasi", () => {
  const days = [day("h1", [stop(undefined)])];
  const snapshot = JSON.stringify(days);
  carryOver(days, [day("h1", [stop(undefined, { photo: "u" })])]);
  assert.equal(JSON.stringify(days), snapshot);
  assert.equal(carryOver(days, [day("h1", [stop(undefined, { photo: "u" })])])[0].stops[0].photo, undefined);
});
