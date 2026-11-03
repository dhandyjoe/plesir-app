import assert from "node:assert/strict";
import test from "node:test";
import { AI_PLAN_JSON_SCHEMA, buildPrompt, toCandidates, topPlaces, toRundown } from "./plan.ts";
import { mapsRouteUrl, mapsStopUrl, NO_ADDRESS } from "./rundown.ts";

const place = (id, name, extra = {}) => ({
  id,
  name,
  address: `Jl. ${name}`,
  lat: -7.98,
  lng: 112.63,
  categories: [],
  openingHours: null,
  photo: null,
  ...extra,
});

const candidates = toCandidates({
  wisata: [place("g1", "Alun-Alun"), place("g2", "Museum")],
  makan: [place("g3", "Warung Contoh"), place("g1", "Alun-Alun")],
  kafe: [place("g4", "Kopi Contoh", { address: null })],
  penginapan: [place("g5", "Hotel Contoh")],
});

const stop = (ref, start, end) => ({ ref, start, end, note: "Dekat tempat sebelumnya." });
const valid = {
  lodgingRef: "p5",
  days: [
    { title: "Kota", stops: [stop("w1", "09:00", "11:00"), stop("m3", "11:30", "12:30")] },
    { title: "Santai", stops: [stop("w2", "08:00", "10:00"), stop("k4", "10:30", "12:00")] },
  ],
  warnings: [],
};

test("toCandidates: ref per kategori, tempat ganda antar kategori dipakai sekali", () => {
  assert.deepEqual(
    candidates.map((c) => [c.ref, c.category, c.id]),
    [
      ["w1", "wisata", "g1"],
      ["w2", "wisata", "g2"],
      ["m3", "makan", "g3"],
      ["k4", "kafe", "g4"],
      ["p5", "penginapan", "g5"],
    ],
  );
});

test("toRundown: output valid memakai nama/alamat dari kandidat, bukan dari model", () => {
  const result = toRundown(valid, candidates, 2, "Kota Malang");
  assert.equal(result.ok, true);
  const [first, second] = result.days;
  assert.equal(first.startMarker.place, "Hotel Contoh");
  assert.equal(first.startMarker.placeId, "g5");
  assert.deepEqual(first.stops[0], {
    placeId: "g1",
    time: "09:00 - 11:00",
    name: "Alun-Alun",
    category: "Wisata",
    address: "Jl. Alun-Alun",
    note: "Dekat tempat sebelumnya.",
    lat: -7.98,
    lng: 112.63,
    city: "Kota Malang",
  });
  assert.equal(first.finishMarker.address, "Jl. Hotel Contoh");
  assert.match(mapsStopUrl(first.finishMarker), /query=Hotel%20Contoh%2C%20Jl\.%20Hotel%20Contoh%2C%20Malang$/);
  assert.equal(second.stops[1].address, NO_ADDRESS);
  assert.match(
    mapsRouteUrl(first),
    /^https:\/\/www\.google\.com\/maps\/dir\/Hotel%20Contoh%2C%20Jl\.%20Hotel%20Contoh%2C%20Malang\/Alun-Alun%2C%20Jl\.%20Alun-Alun%2C%20Malang\//,
  );
});

test("mapsStopUrl: nama+alamat bila ada, nama+bias koordinat bila alamat tidak tersedia", () => {
  const base = { time: "", name: "Warung", category: "Makan", note: "", lat: -7.98, lng: 112.63 };
  assert.equal(
    mapsStopUrl({ ...base, address: "Jl. Mawar, Malang" }),
    "https://www.google.com/maps/search/?api=1&query=Warung%2C%20Jl.%20Mawar%2C%20Malang",
  );
  assert.equal(
    mapsStopUrl({ ...base, address: NO_ADDRESS }),
    "https://www.google.com/maps/search/Warung/@-7.98,112.63,17z",
  );
  assert.equal(
    mapsStopUrl({ lat: -7.98, lng: 112.63 }),
    "https://www.google.com/maps/search/?api=1&query=-7.98%2C112.63",
  );
});

test("toRundown: menolak ref asing, ref ganda, penginapan sebagai stop, dan jumlah hari salah", () => {
  const result = toRundown(
    {
      lodgingRef: "w1",
      days: [{ title: "X", stops: [stop("w1", "09:00", "10:00"), stop("zz9", "10:30", "11:00"), stop("w1", "11:30", "12:00"), stop("p5", "13:00", "14:00")] }],
      warnings: [],
    },
    candidates,
    2,
  );
  assert.equal(result.ok, false);
  const text = result.issues.join("\n");
  assert.match(text, /Harus 2 hari/);
  assert.match(text, /lodgingRef w1 bukan penginapan/);
  assert.match(text, /zz9 tidak ada/);
  assert.match(text, /w1 sudah dipakai/);
  assert.match(text, /p5 adalah penginapan/);
});

test("toRundown: menolak jam rusak, tumpang tindih, dan di luar 07:00–21:00", () => {
  const days = (stops) => ({ lodgingRef: null, days: [{ title: "X", stops }], warnings: [] });
  for (const stops of [
    [stop("w1", "9:00", "10:00")],
    [stop("w1", "09:00", "11:00"), stop("w2", "10:30", "12:00")],
    [stop("w1", "06:30", "08:00")],
    [stop("w1", "20:00", "21:30")],
    [stop("w1", "10:00", "10:00")],
  ]) {
    assert.equal(toRundown(days(stops), candidates, 1).ok, false, JSON.stringify(stops));
  }
  const ok = toRundown(days([stop("w1", "07:00", "21:00")]), candidates, 1);
  assert.equal(ok.ok, true);
  assert.equal(ok.days[0].startMarker.place, "Penginapan (belum dipilih)");
});

test("toRundown: bentuk JSON salah ditolak dengan pesan, bukan throw", () => {
  const result = toRundown({ days: "bukan array" }, candidates, 1);
  assert.equal(result.ok, false);
  assert.ok(result.issues[0].length > 0);
});

test("buildPrompt: memuat kandidat dan alasan retry; schema tanpa $schema", () => {
  const { user } = buildPrompt("Kota Malang", "2026-11-10", 2, candidates, ["Harus 2 hari."]);
  assert.match(user, /w1 \| Wisata \| Alun-Alun \| Jl\. Alun-Alun \| -7\.980,112\.630/);
  assert.match(user, /k4 \| Kafe \| Kopi Contoh \| - \|/);
  assert.match(user, /- Harus 2 hari\./);
  assert.equal(AI_PLAN_JSON_SCHEMA.$schema, undefined);
  assert.equal(AI_PLAN_JSON_SCHEMA.type, "object");
});

test("mapsStopUrl: kota ditambahkan bila belum ada di alamat, tanpa awalan Kota/Kabupaten", () => {
  const base = { name: "Hotel Ciputra", lat: -7, lng: 110, city: "Kota Semarang" };
  assert.match(mapsStopUrl({ ...base, address: "Jl. Simpang Lima" }), /query=Hotel%20Ciputra%2C%20Jl\.%20Simpang%20Lima%2C%20Semarang$/);
  assert.match(mapsStopUrl({ ...base, address: "Jl. X, Semarang, Jawa Tengah" }), /query=Hotel%20Ciputra%2C%20Jl\.%20X%2C%20Semarang%2C%20Jawa%20Tengah$/);
  assert.equal(mapsStopUrl(base), "https://www.google.com/maps/search/Hotel%20Ciputra%2C%20Semarang/@-7,110,17z");
});

test("topPlaces: tempat berfoto didahulukan sebelum dipotong, urutan lain tetap", () => {
  const photo = { commons: "A.jpg" };
  const list = [place("a", "A"), place("b", "B", { photo }), place("c", "C"), place("d", "D", { photo })];
  assert.deepEqual(topPlaces(list, 3).map((p) => p.id), ["b", "d", "a"]);
  assert.deepEqual(topPlaces(list, 10).map((p) => p.id), ["b", "d", "a", "c"]);
});

test("buildPrompt: kandidat berfoto diberi tanda [foto]", () => {
  const candidates = toCandidates({ wisata: [place("a", "A"), place("b", "B", { photo: { commons: "B.jpg" } })] });
  const { user } = buildPrompt("Kota X", "2026-01-01", 1, candidates);
  assert.match(user, /B \| .*\[foto\]/);
  assert.doesNotMatch(user.split("\n").find((l) => l.includes("| A |")), /\[foto\]/);
});

// 2026-11-02 = Senin, 2026-11-08 = Minggu.
test("toRundown: tempat tutup di hari/jam itu ditolak; data kosong jadi warning, bukan penolakan", () => {
  const cs = toCandidates({
    wisata: [place("g1", "Museum", { openingHours: "Tu-Su 09:00-16:00" }), place("g2", "Taman")],
    makan: [place("g3", "Warung", { openingHours: "Mo-Su 10:00-22:00" })],
  });
  const plan = (stops) => ({ lodgingRef: null, days: [{ title: "X", stops }], warnings: [] });
  const options = { start: "2026-11-02" };

  const closed = toRundown(plan([stop("w1", "09:00", "11:00")]), cs, 1, "Kota", options);
  assert.equal(closed.ok, false);
  assert.match(closed.issues[0], /Museum \(w1\) tutup pada 2026-11-02 pukul 09:00/);

  const ok = toRundown(plan([stop("w2", "09:00", "10:00"), stop("m3", "11:00", "12:00")]), cs, 1, "Kota", options);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.warnings, []);

  // Tanpa tanggal mulai, cek jam buka dilewati.
  assert.equal(toRundown(plan([stop("w1", "09:00", "11:00")]), cs, 1).ok, true);
});

test("toRundown: meals mewajibkan sarapan, makan siang, makan malam; tidak dipaksa bila kandidat makan kurang", () => {
  const cs = toCandidates({
    wisata: [place("g1", "Museum")],
    makan: [place("g2", "Warung A"), place("g3", "Warung B"), place("g4", "Warung C")],
    kafe: [place("g5", "Kopi")],
  });
  const plan = (stops) => ({ lodgingRef: null, days: [{ title: "X", stops }], warnings: [] });
  const full = [stop("k5", "07:30", "08:30"), stop("w1", "09:00", "10:30"), stop("m2", "12:00", "13:00"), stop("m3", "18:30", "19:30")];

  assert.equal(toRundown(plan(full), cs, 1, "Kota", { meals: true }).ok, true);

  const noDinner = toRundown(plan(full.slice(0, 3)), cs, 1, "Kota", { meals: true });
  assert.equal(noDinner.ok, false);
  assert.match(noDinner.issues.join("\n"), /belum ada makan malam/);
  // Sarapan di kafe boleh, tetapi makan siang tidak boleh di kafe.
  assert.match(toRundown(plan([stop("k5", "12:00", "13:00")]), cs, 1, "Kota", { meals: true }).issues.join("\n"), /belum ada makan siang/);

  const thin = toCandidates({ wisata: [place("g1", "Museum")], makan: [place("g2", "Warung A")] });
  const limited = toRundown(plan([stop("w1", "09:00", "10:00")]), thin, 1, "Kota", { meals: true });
  assert.equal(limited.ok, true);
  assert.match(limited.warnings[0], /Pilihan tempat makan terbatas/);
});

test("buildPrompt: memuat daftar tanggal berhari dan kolom jam buka", () => {
  const cs = toCandidates({ wisata: [place("g1", "Museum", { openingHours: "Mo-Fr 09:00-16:00" })] });
  const { user, system } = buildPrompt("Kota", "2026-11-02", 2, cs);
  assert.match(user, /Hari 1: 2026-11-02 \(Senin\)\nHari 2: 2026-11-03 \(Selasa\)/);
  assert.match(user, /w1 \| Wisata \| Museum \| Jl\. Museum \| -7\.980,112\.630 \| Mo-Fr 09:00-16:00/);
  assert.match(system, /sarapan/);
  assert.match(system, /07:00–21:00/);
});

test("toRundown: jumlah tempat per hari harus 1–7", () => {
  const days = (stops) => ({ lodgingRef: null, days: [{ title: "X", stops }], warnings: [] });
  const eight = Array.from({ length: 8 }, (_, i) => stop("w1", `${String(7 + i).padStart(2, "0")}:00`, `${String(7 + i).padStart(2, "0")}:30`));
  for (const [stops, count] of [[[], 0], [eight, 8]]) {
    const result = toRundown(days(stops), candidates, 1);
    assert.equal(result.ok, false);
    assert.match(result.issues.join("\n"), new RegExp(`jumlah tempat harus 1–7, bukan ${count}`));
  }
});

test("toRundown: warning model dipotong maksimal 5 dan 200 karakter; yang kosong dibuang", () => {
  const warnings = ["a".repeat(300), "", "   ", "b", "c", "d", "e", "f"];
  const result = toRundown({ lodgingRef: null, days: [{ title: "X", stops: [stop("w1", "09:00", "10:00")] }], warnings }, candidates, 1);
  assert.equal(result.ok, true);
  assert.equal(result.warnings[0].length, 200);
  assert.ok(result.warnings.every(Boolean));
  assert.ok(!result.warnings.includes("f"));
});
