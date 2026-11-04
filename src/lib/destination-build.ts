import { normalize, type Destination } from "./destinations.ts";

/** Satu baris dump GeoNames (cities500.txt) yang dipakai membangun daftar destinasi. */
export type GeonamesRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  admin1: string;
  population: number;
};

// Bagian kota (PPLX), historis, ditinggalkan, dan hancur bukan tujuan wisata.
const SKIPPED_FEATURES = new Set(["PPLX", "PPLH", "PPLQ", "PPLW"]);

/** Kolom: https://download.geonames.org/export/dump/readme.txt. Baris rusak atau bukan permukiman → null. */
export function parseGeonamesRow(line: string): GeonamesRow | null {
  const f = line.split("\t");
  if (f.length < 15 || !/^\d+$/.test(f[0]) || !f[1] || !/^[A-Z]{2}$/.test(f[8])) return null;
  if (f[6] !== "P" || SKIPPED_FEATURES.has(f[7])) return null;
  const lat = f[4] === "" ? NaN : Number(f[4]);
  const lng = f[5] === "" ? NaN : Number(f[5]);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return null;
  return { id: f[0], name: f[1], lat, lng, country: f[8], admin1: f[10], population: Number(f[14]) || 0 };
}

/** Populasi ≥ minPopulation atau punya artikel Wikivoyage; hanya negara yang diaktifkan. */
export function selectCandidates(
  rows: readonly GeonamesRow[],
  wikivoyageIds: ReadonlySet<string>,
  countries: readonly string[],
  minPopulation = 5_000,
) {
  return rows.filter(
    (r) => countries.includes(r.country) && (r.population >= minPopulation || wikivoyageIds.has(r.id)),
  );
}

/** Kunci perbandingan nama: tanpa awalan wilayah, diakritik, spasi, dan tanda baca ("Tebingtinggi" = "Tebing Tinggi"). */
const compact = (name: string) => normalize(name).replace(/[^\p{L}\p{N}]/gu, "");

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Menambahkan kandidat GeoNames sebagai kawasan di belakang daftar lama; baris lama tidak pernah diubah atau dibuang.
 * Kandidat dilewati bila tautan Wikidata-nya (`qids`: ID GeoNames → QID) menunjuk wilayah lama, namanya sama dengan
 * wilayah lama atau kandidat berpopulasi lebih besar di provinsi yang sama, atau provinsinya tidak dikenal.
 * Nama memakai nama GeoNames: item Wikidata yang tertaut kadang entitas lain (tanjung, pantai), jadi labelnya tidak aman.
 */
export function mergeDestinations(
  legacy: readonly Destination[],
  candidates: readonly GeonamesRow[],
  qids: ReadonlyMap<string, string>,
  provinces: ReadonlyMap<string, string>,
) {
  const legacyIds = new Set(legacy.map((d) => d.id));
  const seen = new Set(legacy.map((d) => `${d.country}|${d.province}|${compact(d.name)}`));
  const added: Destination[] = [];
  const skipped: string[] = [];

  for (const c of [...candidates].sort((a, b) => b.population - a.population)) {
    const qid = qids.get(c.id);
    const province = provinces.get(`${c.country}.${c.admin1}`);
    const key = `${c.country}|${province}|${compact(c.name)}`;

    if (qid && legacyIds.has(qid)) skipped.push(`${c.name} (${c.id}): sudah ada sebagai ${qid}`);
    else if (!province) skipped.push(`${c.name} (${c.id}): provinsi ${c.country}.${c.admin1} tidak dikenal`);
    else if (!compact(c.name)) skipped.push(`${c.name} (${c.id}): nama kosong`);
    else if (seen.has(key)) skipped.push(`${c.name} (${c.id}): nama ganda di ${province}`);
    else {
      seen.add(key);
      added.push({
        id: `G${c.id}`,
        name: c.name,
        province,
        kind: "kawasan",
        country: c.country,
        lat: round(c.lat),
        lng: round(c.lng),
      });
    }
  }

  return { rows: [...legacy, ...added], added, skipped };
}
