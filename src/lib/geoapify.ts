import { z } from "zod";

export const PlaceCategory = z.enum(["penginapan", "makan", "kafe", "wisata"]);
export type PlaceCategory = z.infer<typeof PlaceCategory>;

/** Kategori Plesir → kategori Geoapify (https://apidocs.geoapify.com/docs/places/#categories). */
export const GEOAPIFY_CATEGORIES: Record<PlaceCategory, string> = {
  penginapan: "accommodation.hotel,accommodation.guest_house",
  makan: "catering.restaurant",
  kafe: "catering.cafe",
  wisata: "tourism.attraction,tourism.sights,entertainment.museum,leisure.park",
};

/** Wajib tampil di UI yang memakai data ini (syarat paket Free Geoapify + lisensi OSM). */
export const PLACES_ATTRIBUTION =
  "Powered by Geoapify · © OpenStreetMap contributors";

/** Rujukan foto dari tag OSM: nama file Commons (tanpa awalan `File:`) atau ID Wikidata (foto dari klaim P18). */
export type PhotoRef = { commons: string } | { wikidata: string };

export type Place = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  categories: string[];
  /** Tag OSM `opening_hours` mentah; sering kosong. */
  openingHours: string | null;
  /** Hanya dari tag OSM yang menunjuk Wikimedia; `null` bila tempat tidak punya foto. */
  photo: PhotoRef | null;
};

const Feature = z.object({
  properties: z.object({
    place_id: z.string(),
    name: z.string().min(1),
    formatted: z.string().optional(),
    lat: z.number(),
    lon: z.number(),
    categories: z.array(z.string()).default([]),
    datasource: z
      .object({
        raw: z
          .object({
            opening_hours: z.string().optional(),
            wikimedia_commons: z.string().optional(),
            image: z.string().optional(),
            wikidata: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

const COMMONS_FILE_URL = /^https?:\/\/commons\.wikimedia\.org\/wiki\/File:(.+)$/i;

/** Nama file Commons dari `File:Nama.jpg` atau URL halaman file; kategori dan host lain (lisensi tak jelas) ditolak. */
function commonsFile(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const name = /^File:(.+)$/i.exec(v)?.[1] ?? COMMONS_FILE_URL.exec(v)?.[1];
  if (!name) return null;
  try {
    return decodeURIComponent(name).replaceAll("_", " ").trim() || null;
  } catch {
    return null;
  }
}

export function photoRef(raw: {
  wikimedia_commons?: string;
  image?: string;
  wikidata?: string;
}): PhotoRef | null {
  const file = commonsFile(raw.wikimedia_commons) ?? commonsFile(raw.image);
  if (file) return { commons: file };
  const qid = raw.wikidata?.trim();
  return qid && /^Q\d+$/.test(qid) ? { wikidata: qid } : null;
}

/** Ubah GeoJSON Places API ke `Place[]`; fitur tanpa nama atau koordinat dibuang, bukan ditebak. */
export function toPlaces(json: unknown): Place[] {
  const { features } = z.object({ features: z.array(z.unknown()) }).parse(json);
  return features.flatMap((feature) => {
    const parsed = Feature.safeParse(feature);
    if (!parsed.success) return [];
    const p = parsed.data.properties;
    return [
      {
        id: p.place_id,
        name: p.name,
        address: p.formatted ?? null,
        lat: p.lat,
        lng: p.lon,
        categories: p.categories,
        openingHours: p.datasource?.raw?.opening_hours ?? null,
        photo: photoRef(p.datasource?.raw ?? {}),
      },
    ];
  });
}
