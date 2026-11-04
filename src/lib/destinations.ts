import data from "../data/destinations.json" with { type: "json" };

/** `Q…` = ID Wikidata (kabupaten/kota), `G…` = ID GeoNames (kawasan seperti Ubud). */
export const DESTINATION_ID = /^[QG]\d+$/;

export type Destination = {
  id: string;
  name: string;
  province: string;
  kind: "kota" | "kabupaten" | "kawasan";
  /** Kode negara ISO 3166-1 alpha-2. */
  country: string;
  lat: number | null;
  lng: number | null;
};

const destinations: readonly Destination[] = data as Destination[];

/** Huruf kecil, tanpa diakritik, tanpa awalan jenis wilayah ("kota", "kabupaten", "kab."). */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(kabupaten|kota|kab\.?) /, "");
}

const index = destinations.map((d) => ({ d, key: normalize(d.name), province: normalize(d.province) }));

/** Peringkat: awalan nama (0) > awalan kata (1) > mengandung (2) > hanya cocok provinsi (3); kota diurutkan sebelum kabupaten. */
export function searchDestinations(query: string, limit = 8, offset = 0): Destination[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const hits: { d: Destination; rank: number }[] = [];
  for (const { d, key, province } of index) {
    const at = key.indexOf(q);
    if (at >= 0) hits.push({ d, rank: at === 0 ? 0 : key[at - 1] === " " ? 1 : 2 });
    else if (province.includes(q)) hits.push({ d, rank: 3 });
  }

  return hits
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(a.d.kind === "kabupaten") - Number(b.d.kind === "kabupaten") ||
        a.d.name.localeCompare(b.d.name, "id"),
    )
    .slice(offset, offset + limit)
    .map((h) => h.d);
}

export function getDestination(id: string) {
  return destinations.find((d) => d.id === id) ?? null;
}
