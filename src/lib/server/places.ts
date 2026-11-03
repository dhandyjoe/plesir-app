import "server-only";
import { cacheLife } from "next/cache";
import { getDestination } from "@/lib/destinations";
import {
  GEOAPIFY_CATEGORIES,
  toPlaces,
  type Place,
  type PlaceCategory,
} from "@/lib/geoapify";
import { QuotaExceededError, reserveQuota } from "./quota";

export type PlacesResult =
  | { ok: true; places: Place[] }
  | { ok: false; reason: "quota"; resetAt: string }
  | { ok: false; reason: "unavailable" };

const RADIUS_METERS = { kota: 8_000, kabupaten: 20_000 };

/**
 * Cache per (destinasi, kategori) agar request berulang tidak memakan credit.
 * Hasil gagal dikembalikan sebagai nilai (bukan throw) dan hanya di-cache sebentar.
 */
export async function getPlaces(
  destinationId: string,
  category: PlaceCategory,
): Promise<PlacesResult> {
  "use cache";

  const destination = getDestination(destinationId);
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!destination?.lat || !destination.lng || !apiKey) {
    console.error("places: destinasi tanpa koordinat atau GEOAPIFY_API_KEY kosong");
    cacheLife("seconds");
    return { ok: false, reason: "unavailable" };
  }

  try {
    // ≤ 20 tempat per request = 1 credit (https://www.geoapify.com/pricing-details/).
    await reserveQuota("geoapify", 1);

    const { lat, lng, kind } = destination;
    const params = new URLSearchParams({
      categories: GEOAPIFY_CATEGORIES[category],
      filter: `circle:${lng},${lat},${RADIUS_METERS[kind]}`,
      bias: `proximity:${lng},${lat}`,
      limit: "20",
      lang: "id",
      apiKey,
    });
    const response = await fetch(`https://api.geoapify.com/v2/places?${params}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Geoapify HTTP ${response.status}`);

    const places = toPlaces(await response.json());
    cacheLife("days");
    return { ok: true, places };
  } catch (error) {
    cacheLife("seconds");
    if (error instanceof QuotaExceededError) {
      return { ok: false, reason: "quota", resetAt: error.resetAt.toISOString() };
    }
    console.error("places: gagal memuat dari Geoapify", error);
    return { ok: false, reason: "unavailable" };
  }
}
