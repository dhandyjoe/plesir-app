import { z } from "zod";

/** Foto Wikimedia Commons beserta data atribusi yang wajib tampil di UI (lisensi CC). */
export type Photo = {
  url: string;
  author: string;
  license: string;
  /** Halaman file di Commons. */
  source: string;
};

/** Host thumbnail yang dikembalikan API (diperiksa langsung: `thumb.wikimedia.org`); `next.config.ts` harus mengizinkan host yang sama. */
export const THUMB_HOSTS = ["thumb.wikimedia.org", "upload.wikimedia.org"];
const SOURCE_HOST = "commons.wikimedia.org";
const MAX_AUTHOR = 80;

const httpsUrl = (...hosts: string[]) =>
  z.string().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && hosts.includes(url.hostname);
    } catch {
      return false;
    }
  });

const Claims = z.object({
  entities: z.record(
    z.string(),
    z.object({
      claims: z
        .object({
          P18: z
            .array(z.object({ mainsnak: z.object({ datavalue: z.object({ value: z.string() }).optional() }) }))
            .optional(),
        })
        .optional(),
    }),
  ),
});

/** Respons `wbgetentities` (props=claims) → ID Wikidata ke nama file foto utama (P18). Entitas tanpa P18 dilewati. */
export function toWikidataImages(json: unknown): Record<string, string> {
  const parsed = Claims.safeParse(json);
  if (!parsed.success) return {};
  const out: Record<string, string> = {};
  for (const [qid, entity] of Object.entries(parsed.data.entities)) {
    const file = entity.claims?.P18?.[0]?.mainsnak.datavalue?.value.trim();
    if (file) out[qid] = file;
  }
  return out;
}

const Meta = z.object({ value: z.string() });

const Pages = z.object({ query: z.object({ pages: z.array(z.unknown()) }) });

const Page = z.object({
  title: z.string(),
  imageinfo: z
    .array(
      z.object({
        thumburl: httpsUrl(...THUMB_HOSTS),
        descriptionurl: httpsUrl(SOURCE_HOST),
        extmetadata: z.object({ Artist: Meta.optional(), LicenseShortName: Meta.optional() }).optional(),
      }),
    )
    .optional(),
});

/** Teks polos dari HTML `Artist` Commons, dipotong agar muat di label. */
const plain = (html: string) => {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;|&gt;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > MAX_AUTHOR ? `${text.slice(0, MAX_AUTHOR - 1).trimEnd()}…` : text;
};

/**
 * Respons `action=query&prop=imageinfo&iiprop=url|extmetadata&formatversion=2` → nama file (tanpa `File:`) ke `Photo`.
 * File tanpa thumbnail dari upload.wikimedia.org atau tanpa lisensi dilewati; penulis kosong jadi "Tidak diketahui", bukan ditebak.
 */
export function toCommonsPhotos(json: unknown): Record<string, Photo> {
  const parsed = Pages.safeParse(json);
  if (!parsed.success) return {};
  const out: Record<string, Photo> = {};
  for (const raw of parsed.data.query.pages) {
    const page = Page.safeParse(raw);
    if (!page.success) continue;
    const info = page.data.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value.trim();
    if (!info || !license) continue;
    out[page.data.title.replace(/^File:/i, "")] = {
      // Query utm_* dibuang: tidak mengubah gambar, dan `remotePatterns` Next mencocokkan query secara ketat (search: "").
      url: info.thumburl.split("?")[0],
      author: plain(info.extmetadata?.Artist?.value ?? "") || "Tidak diketahui",
      license,
      source: info.descriptionurl,
    };
  }
  return out;
}
