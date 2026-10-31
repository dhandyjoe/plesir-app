// Membangun src/data/destinations.json dari Wikidata (CC0). Jalankan manual: node scripts/build-destinations.mjs
import { writeFile } from "node:fs/promises";
import { z } from "zod";

const OUT = new URL("../src/data/destinations.json", import.meta.url);
const EXPECTED = 514; // 416 kabupaten + 98 kota (termasuk 5 kota administrasi DKI Jakarta)

// Q3191695 kabupaten, Q11127777 kabupaten administrasi, Q3199141 kota, Q4272761 kota administrasi.
const QUERY = `
SELECT ?item ?cls ?itemLabel ?provLabel ?coord WHERE {
  VALUES ?cls { wd:Q3191695 wd:Q11127777 wd:Q3199141 wd:Q4272761 }
  ?item wdt:P31 ?cls .
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P131+ ?prov . ?prov wdt:P31 wd:Q5098 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "id,en". }
}`;

// Q6169793 = nama lama Kabupaten Kepulauan Yapen (Q27848), masih tercatat sebagai item terpisah.
const SKIP = new Set(["Q6169793"]);
// Item tanpa label id/en di Wikidata (labelnya jatuh ke QID).
const NAME_OVERRIDES = { Q10365: "Ciamis" };
const KOTA = new Set(["Q3199141", "Q4272761"]);

const Row = z.object({
  id: z.string().regex(/^Q\d+$/),
  name: z.string().min(3).refine((n) => !/\bQ\d+$/.test(n), "label Wikidata kosong"),
  province: z.string().min(2),
  kind: z.enum(["kota", "kabupaten"]),
  lat: z.number().min(-12).max(7).nullable(),
  lng: z.number().min(94).max(142).nullable(),
});

const res = await fetch(
  `https://query.wikidata.org/sparql?${new URLSearchParams({ query: QUERY })}`,
  {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "plesir-build/0.1 (https://plesir.app)",
    },
  },
);
if (!res.ok) throw new Error(`Wikidata ${res.status}`);
const { bindings } = (await res.json()).results;

const byId = new Map();
for (const b of bindings) {
  const id = b.item.value.split("/").pop();
  if (SKIP.has(id) || byId.has(id)) continue; // satu item bisa muncul lebih dari sekali (banyak koordinat)
  const cls = b.cls.value.split("/").pop();
  const base = NAME_OVERRIDES[id] ?? b.itemLabel.value
    .replace(/^(Kabupaten|Kota Administrasi|Kota)\s+/i, "")
    .trim();
  const point = b.coord?.value.match(/^Point\(([-\d.]+) ([-\d.]+)\)$/);
  byId.set(id, {
    id,
    // Kota administrasi Jakarta dipakai apa adanya ("Jakarta Barat"); "Malang" ada sebagai kota dan kabupaten.
    name: cls === "Q4272761" ? base : `${KOTA.has(cls) ? "Kota" : "Kabupaten"} ${base}`,
    province: b.provLabel?.value, // kosong → gagal di zod
    kind: KOTA.has(cls) ? "kota" : "kabupaten",
    lat: point ? Number(point[2]) : null,
    lng: point ? Number(point[1]) : null,
  });
}

const rows = z.array(Row).parse([...byId.values()]);
const names = rows.map((r) => r.name);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);

if (dupes.length) throw new Error(`Nama ganda: ${dupes.join(", ")}`);
if (rows.length !== EXPECTED) {
  throw new Error(`Harapannya ${EXPECTED} baris, dapat ${rows.length}. Periksa kelas Wikidata.`);
}
for (const r of rows.filter((r) => r.lat === null)) console.warn(`Tanpa koordinat: ${r.name}`);

rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
await writeFile(OUT, `${JSON.stringify(rows, null, 1)}\n`);
console.log(`${rows.length} destinasi → src/data/destinations.json`);
