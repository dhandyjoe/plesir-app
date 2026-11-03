import "server-only";
import { cacheLife } from "next/cache";
import { toCommonsPhotos, toWikidataImages, type Photo } from "@/lib/commons";
import type { PhotoRef } from "@/lib/geoapify";

/** Kebijakan Wikimedia mewajibkan User-Agent yang bisa dihubungi (https://meta.wikimedia.org/wiki/User-Agent_policy). */
const USER_AGENT = "Plesir/0.1 (https://github.com/dhandyjoe/plesir-app)";
const BATCH = 50;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  return response.json();
}

/** QID → nama file P18. Gagal dikembalikan sebagai peta kosong dan hanya di-cache sebentar. */
async function wikidataImages(qids: string[]): Promise<Record<string, string>> {
  "use cache";
  try {
    const params = new URLSearchParams({
      action: "wbgetentities",
      ids: qids.join("|"),
      props: "claims",
      format: "json",
    });
    const out = toWikidataImages(await fetchJson(`https://www.wikidata.org/w/api.php?${params}`));
    cacheLife("days");
    return out;
  } catch (error) {
    cacheLife("seconds");
    console.error("photos: gagal memuat Wikidata", error);
    return {};
  }
}

/** Nama file → foto beserta atribusi. */
async function commonsPhotos(files: string[]): Promise<Record<string, Photo>> {
  "use cache";
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: files.map((file) => `File:${file}`).join("|"),
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "640",
      format: "json",
      formatversion: "2",
    });
    const out = toCommonsPhotos(await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`));
    cacheLife("days");
    return out;
  } catch (error) {
    cacheLife("seconds");
    console.error("photos: gagal memuat Commons", error);
    return {};
  }
}

const chunks = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) => items.slice(i * BATCH, (i + 1) * BATCH));

/** Kunci hasil `getPhotos` untuk satu rujukan; dipakai pemanggil untuk mencari fotonya. */
export const photoKey = (ref: PhotoRef) => ("commons" in ref ? `c:${ref.commons}` : `w:${ref.wikidata}`);

/**
 * Rujukan foto (dari tag OSM) → foto Commons. Wikimedia gratis dan tanpa kuota; kegagalan tidak melempar,
 * rujukan yang tak terselesaikan tidak ada di hasil sehingga UI menampilkan placeholder.
 */
export async function getPhotos(refs: PhotoRef[]): Promise<Map<string, Photo>> {
  const qids = [...new Set(refs.flatMap((ref) => ("wikidata" in ref ? [ref.wikidata] : [])))].sort();
  const wikidata: Record<string, string> = {};
  for (const batch of chunks(qids)) Object.assign(wikidata, await wikidataImages(batch));

  const fileOf = (ref: PhotoRef) => ("commons" in ref ? ref.commons : wikidata[ref.wikidata]);
  // "|" memisahkan judul di query Commons, jadi nama yang memuatnya dilewati daripada salah cocok.
  const files = [...new Set(refs.map(fileOf).filter((file): file is string => !!file && !file.includes("|")))].sort();
  const photos: Record<string, Photo> = {};
  for (const batch of chunks(files)) Object.assign(photos, await commonsPhotos(batch));

  const out = new Map<string, Photo>();
  for (const ref of refs) {
    const photo = photos[fileOf(ref)?.replaceAll("_", " ") ?? ""];
    if (photo) out.set(photoKey(ref), photo);
  }
  return out;
}
