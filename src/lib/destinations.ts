import data from "../data/destinations.json" with { type: "json" };

export type Destination = {
  id: string;
  name: string;
  province: string;
  kind: "kota" | "kabupaten";
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

const index = destinations.map((d) => ({ d, key: normalize(d.name) }));

/** Peringkat: awalan nama (0) > awalan kata (1) > mengandung (2); kota diurutkan sebelum kabupaten. */
export function searchDestinations(query: string, limit = 8): Destination[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const hits: { d: Destination; rank: number }[] = [];
  for (const { d, key } of index) {
    const at = key.indexOf(q);
    if (at < 0) continue;
    hits.push({ d, rank: at === 0 ? 0 : key[at - 1] === " " ? 1 : 2 });
  }

  return hits
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(a.d.kind === "kabupaten") - Number(b.d.kind === "kabupaten") ||
        a.d.name.localeCompare(b.d.name, "id"),
    )
    .slice(0, limit)
    .map((h) => h.d);
}

export function getDestination(id: string) {
  return destinations.find((d) => d.id === id) ?? null;
}
