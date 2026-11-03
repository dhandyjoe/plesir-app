import type { Leg } from "./route";

/** Atribusi foto Commons; wajib tampil untuk lisensi CC. Kosong pada ilustrasi mock. */
export type PhotoCredit = { author: string; license: string; source: string };

export type RundownStop = {
  /** ID tempat Geoapify; dipakai mencocokkan stop ke kandidat saat revisi. Kosong pada data mock. */
  placeId?: string;
  time: string;
  name: string;
  category: string;
  address: string;
  note: string;
  lat?: number;
  lng?: number;
  /** Kota tujuan; memperjelas pencarian Maps untuk nama yang ada di banyak kota. */
  city?: string;
  /** Estimasi berkendara dari titik sebelumnya (penginapan untuk stop pertama); tampil di garis penghubung. Kosong bila rute gagal dihitung. */
  fromPrev?: Leg;
  /** Thumbnail Wikimedia Commons (dengan `photoCredit`), atau ilustrasi mock; kosong bila tempat tidak punya foto. */
  photo?: string;
  photoCredit?: PhotoCredit;
};

export type Marker = {
  placeId?: string;
  time?: string;
  place: string;
  address?: string;
  photo?: string;
  photoCredit?: PhotoCredit;
  lat?: number;
  lng?: number;
  city?: string;
  /** Hanya dipakai finishMarker: estimasi dari stop terakhir kembali ke penginapan. */
  fromPrev?: Leg;
};

export type RundownDay = {
  title: string;
  startMarker: Marker;
  finishMarker: Marker;
  stops: RundownStop[];
};

export const NO_ADDRESS = "Alamat belum tersedia";

type MapsPoint = { name?: string; place?: string; address?: string; lat?: number; lng?: number; city?: string };

const nameOf = (p: MapsPoint) => p.name ?? p.place;
const hasAddress = (p: MapsPoint) => !!p.address && p.address !== NO_ADDRESS;
const hasCoords = (p: MapsPoint) => p.lat != null && p.lng != null;

/** Nama kota tanpa awalan "Kota"/"Kabupaten", hanya bila belum disebut di alamat; "Hotel Ciputra" jadi "Hotel Ciputra, Semarang". */
const cityMissing = (p: MapsPoint) => {
  const city = p.city?.replace(/^(Kota|Kabupaten|Kab\.)\s+/i, "").trim();
  return city && !p.address?.toLowerCase().includes(city.toLowerCase()) ? city : undefined;
};

/**
 * Teks pencarian untuk Maps: nama + alamat, atau nama saja, agar Maps membuka kartu tempat (foto, ulasan, jam buka).
 * Koordinat polos hanya pin tanpa nama, jadi dipakai paling akhir.
 * shortcut: teks bisa salah cocok bila nama OSM beda dari Google, naikkan ke query_place_id bila memakai Google Places.
 */
const point = (p: MapsPoint) => {
  const name = nameOf(p);
  if (name) return [name, hasAddress(p) ? p.address : undefined, cityMissing(p)].filter(Boolean).join(", ");
  return hasCoords(p) ? `${p.lat},${p.lng}` : "";
};

/** Untuk stop maupun penginapan (Marker); penginapan tanpa koordinat tidak punya tautan. */
export const mapsStopUrl = (stop: MapsPoint) => {
  const name = nameOf(stop);
  // Tanpa alamat, nama dicari dengan koordinat sebagai bias lokasi (format path, bukan api=1) agar tetap jadi kartu tempat.
  if (name && !hasAddress(stop) && hasCoords(stop)) {
    return `https://www.google.com/maps/search/${encodeURIComponent(point(stop))}/@${stop.lat},${stop.lng},17z`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point(stop))}`;
};

export const mapsRouteUrl = (day: RundownDay) =>
  `https://www.google.com/maps/dir/${[
    // Penginapan placeholder tanpa koordinat tidak ikut, agar Maps tidak mencari teks "Penginapan".
    ...(day.startMarker.lat != null ? [day.startMarker] : []),
    ...day.stops,
  ]
    .map((p) => encodeURIComponent(point(p)))
    .join("/")}`;
