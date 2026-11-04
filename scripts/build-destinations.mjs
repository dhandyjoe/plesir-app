// Membangun src/data/destinations.json: 514 kabupaten/kota dari Wikidata (CC0) + kawasan dari GeoNames (CC BY 4.0).
// Jalankan manual: node scripts/build-destinations.mjs (butuh jaringan dan `unzip`).
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { mergeDestinations, parseGeonamesRow, selectCandidates } from "../src/lib/destination-build.ts";

const OUT = new URL("../src/data/destinations.json", import.meta.url);
const EXPECTED = 514; // 416 kabupaten + 98 kota (termasuk 5 kota administrasi DKI Jakarta)
// Negara yang masuk daftar. Negara lain butuh perubahan di tempat lain (zona waktu WIB, atribusi, PRD) sebelum dibuka.
const ENABLED_COUNTRIES = ["ID"];
const GEONAMES = "https://download.geonames.org/export/dump";
const WDQS = "https://query.wikidata.org/sparql";
const BATCH = 300;

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
// Provinsi baru yang belum punya label id di Wikidata (label jatuh ke bahasa Inggris).
const PROVINCE_OVERRIDES = {
  "Central Papua": "Papua Tengah",
  "South Papua": "Papua Selatan",
  "Highland Papua": "Papua Pegunungan",
};

const Row = z.object({
  id: z.string().regex(/^[QG]\d+$/),
  name: z.string().min(3).refine((n) => !/\bQ\d+$/.test(n), "label Wikidata kosong"),
  province: z.string().min(2),
  kind: z.enum(["kota", "kabupaten", "kawasan"]),
  country: z.string().regex(/^[A-Z]{2}$/),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

const run = promisify(execFile);

async function sparql(query) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(WDQS, {
      method: "POST",
      body: new URLSearchParams({ query }),
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "plesir-build/0.1 (https://plesir.app)",
      },
      signal: AbortSignal.timeout(120_000),
    });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, (Number(res.headers.get("retry-after")) || 10) * 1000));
      continue;
    }
    throw new Error(`Wikidata ${res.status}`);
  }
}

const lastSegment = (uri) => uri.split("/").pop();

async function legacyRows() {
  const byId = new Map();
  for (const b of await sparql(QUERY)) {
    const id = lastSegment(b.item.value);
    if (SKIP.has(id) || byId.has(id)) continue; // satu item bisa muncul lebih dari sekali (banyak koordinat)
    const cls = lastSegment(b.cls.value);
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
      country: "ID",
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
  return rows;
}

// shortcut: unzip dari PATH dan seluruh cities500.txt dibaca ke memori (~60 MB), ganti dengan parser stream bila daftar dunia dibuka.
async function geonames() {
  const dir = await mkdtemp(join(tmpdir(), "plesir-geonames-"));
  try {
    const download = async (file) => {
      const res = await fetch(`${GEONAMES}/${file}`, { signal: AbortSignal.timeout(300_000) });
      if (!res.ok) throw new Error(`GeoNames ${file} ${res.status}`);
      const path = join(dir, file);
      await writeFile(path, Buffer.from(await res.arrayBuffer()));
      return path;
    };
    const zip = await download("cities500.zip");
    const { stdout } = await run("unzip", ["-p", zip, "cities500.txt"], { maxBuffer: 512 * 1024 * 1024 });
    const admin1 = await readFile(await download("admin1CodesASCII.txt"), "utf8");
    return { cities: stdout.split("\n").map(parseGeonamesRow).filter(Boolean), admin1 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** ID GeoNames dari item Wikidata yang punya artikel Wikivoyage bahasa Inggris. */
async function wikivoyageIds() {
  const bindings = await sparql(`SELECT ?gn WHERE {
    ?page schema:isPartOf <https://en.wikivoyage.org/>; schema:about ?item .
    ?item wdt:P1566 ?gn .
  }`);
  return new Set(bindings.map((b) => b.gn.value));
}

/** ID GeoNames → { qid, label } lewat P1566. Label Indonesia, lalu Inggris; kosong bila tidak ada. */
async function wikidataLinks(geonameIds) {
  const links = new Map();
  for (let i = 0; i < geonameIds.length; i += BATCH) {
    const values = geonameIds.slice(i, i + BATCH).map((id) => `"${id}"`).join(" ");
    const bindings = await sparql(`SELECT ?gn ?item ?idl ?enl WHERE {
      VALUES ?gn { ${values} }
      ?item wdt:P1566 ?gn .
      OPTIONAL { ?item rdfs:label ?idl . FILTER(LANG(?idl) = "id") }
      OPTIONAL { ?item rdfs:label ?enl . FILTER(LANG(?enl) = "en") }
    }`);
    for (const b of bindings) {
      const gn = b.gn.value;
      if (links.has(gn)) continue;
      links.set(gn, { qid: lastSegment(b.item.value), label: b.idl?.value ?? b.enl?.value ?? null });
    }
  }
  return links;
}

const legacy = await legacyRows();
const previousIds = JSON.parse(await readFile(OUT, "utf8")).map((d) => d.id);

const { cities, admin1 } = await geonames();
const candidates = selectCandidates(cities, await wikivoyageIds(), ENABLED_COUNTRIES);

const admin1Ids = new Map(); // "ID.08" → { geonameId, name }
for (const line of admin1.split("\n")) {
  const [code, name, , geonameId] = line.split("\t");
  if (geonameId && ENABLED_COUNTRIES.includes(code.split(".")[0])) admin1Ids.set(code, { geonameId, name });
}

const links = await wikidataLinks([...new Set([...candidates.map((c) => c.id), ...[...admin1Ids.values()].map((a) => a.geonameId)])]);
const provinces = new Map(
  [...admin1Ids].map(([code, a]) => {
    const label = links.get(a.geonameId)?.label ?? a.name;
    return [code, PROVINCE_OVERRIDES[label] ?? label];
  }),
);
const qids = new Map([...links].map(([gn, link]) => [gn, link.qid]));
const { rows: merged, added, skipped } = mergeDestinations(legacy, candidates, qids, provinces);

const rows = z.array(Row).parse(merged);
const ids = new Set(rows.map((r) => r.id));
if (ids.size !== rows.length) throw new Error("ID ganda");
const lost = previousIds.filter((id) => !ids.has(id));
if (lost.length) throw new Error(`ID lama hilang (itinerary tersimpan akan rusak): ${lost.join(", ")}`);

const legacyProvinces = new Set(legacy.map((d) => d.province));
const unknownProvinces = new Set(added.filter((d) => d.country === "ID" && !legacyProvinces.has(d.province)).map((d) => d.province));
if (unknownProvinces.size) console.warn(`Provinsi baru di luar 514 wilayah: ${[...unknownProvinces].join(", ")}`);
for (const s of skipped) console.warn(`Dilewati: ${s}`);
console.log(`${candidates.length} kandidat GeoNames, ${links.size} tertaut Wikidata, ${added.length} ditambahkan, ${skipped.length} dilewati`);

rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
await writeFile(OUT, `${JSON.stringify(rows, null, 1)}\n`);
console.log(`${rows.length} destinasi → src/data/destinations.json`);
