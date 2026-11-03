import "server-only";
import { carryOver } from "@/lib/enrich";
import type { PhotoRef } from "@/lib/geoapify";
import type { Leg } from "@/lib/route";
import type { RundownDay, RundownStop } from "@/lib/rundown";
import { getPhotos, photoKey } from "./photos";
import { getLeg } from "./routes";

export const ROUTE_WARNING = "Jarak tempuh belum dapat dihitung.";

/**
 * Tempel foto (Wikimedia) dan jarak berkendara antar titik berurutan ke rundown yang sudah divalidasi.
 * Keduanya dari provider, tidak pernah dari model. Gagal berarti field dibiarkan kosong (UI menampilkan placeholder),
 * tidak ada nilai pengganti yang dikarang. `previous` = rundown sebelum revisi, supaya stop lama tidak diambil ulang.
 * Tidak melempar: kegagalan foto senyap (kosmetik), kegagalan jarak menambah warning.
 */
export async function enrichDays(
  days: RundownDay[],
  places: Map<string, { photo: PhotoRef | null }>,
  previous: RundownDay[] = [],
): Promise<{ days: RundownDay[]; warnings: string[] }> {
  const base = carryOver(days, previous);
  const warnings: string[] = [];

  const refOf = (placeId: string | undefined) => (placeId ? places.get(placeId)?.photo ?? null : null);
  const lodging = base[0]?.startMarker;

  const refs = [
    ...(lodging && !lodging.photo ? [refOf(lodging.placeId)] : []),
    ...base.flatMap((day) => day.stops.filter((s) => !s.photo).map((s) => refOf(s.placeId))),
  ].filter((ref): ref is PhotoRef => ref !== null);
  const photos = refs.length ? await getPhotos(refs) : new Map();

  // Ruas dihitung berurutan (penginapan → stop 1 → … → penginapan); satu kredit per ruas, diserial agar kuota Firestore tidak berebut.
  type Pt = { lat?: number; lng?: number };
  let failed = false;
  const legBetween = async (from: Pt, to: Pt): Promise<{ fromPrev?: Leg }> => {
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
      failed = true;
      return {};
    }
    const result = await getLeg({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
    // Rute ditolak (mis. tak terjangkau jalan) tetap dilaporkan, bukan diam-diam kosong.
    if (!result.ok || !result.leg) failed = true;
    return result.ok && result.leg ? { fromPrev: result.leg } : {};
  };
  const legged: RundownDay[] = [];
  for (const day of base) {
    const stops: RundownStop[] = [];
    for (const [i, s] of day.stops.entries()) {
      stops.push(s.fromPrev ? s : { ...s, ...(await legBetween(i ? day.stops[i - 1] : day.startMarker, s)) });
    }
    const last = stops.at(-1);
    const finish =
      day.finishMarker.fromPrev || !last ? day.finishMarker : { ...day.finishMarker, ...(await legBetween(last, day.finishMarker)) };
    legged.push({ ...day, stops, finishMarker: finish });
  }
  if (failed) warnings.push(ROUTE_WARNING);

  const credit = (ref: PhotoRef | null) => {
    const photo = ref ? photos.get(photoKey(ref)) : undefined;
    return photo ? { photo: photo.url, photoCredit: { author: photo.author, license: photo.license, source: photo.source } } : {};
  };
  const marker = <M extends RundownDay["startMarker"]>(m: M): M =>
    m.photo ? m : { ...m, ...credit(refOf(m.placeId)) };

  return {
    warnings,
    days: legged.map((day) => ({
      ...day,
      startMarker: marker(day.startMarker),
      finishMarker: marker(day.finishMarker),
      stops: day.stops.map((s) => ({ ...s, ...(s.photo ? {} : credit(refOf(s.placeId))) })),
    })),
  };
}
