import "server-only";
import { cacheLife } from "next/cache";
import { toMatrix, type Leg } from "@/lib/route";
import { QuotaExceededError, reserveQuota } from "./quota";

type Point = { lat: number; lng: number };

export type LegResult =
  | { ok: true; leg: Leg | null }
  | { ok: false; reason: "quota"; resetAt: string }
  | { ok: false; reason: "unavailable" };

/**
 * Estimasi berkendara satu ruas (titik awal → titik tujuan) lewat Route Matrix 1×1: biaya Geoapify 1 kredit
 * (`max(sumber, target) × min(sumber, target, 10)`, https://www.geoapify.com/pricing-details/).
 * Di-cache per koordinat; gagal dikembalikan sebagai nilai dan hanya di-cache sebentar. `leg` null = tidak ada rute.
 */
export async function getLeg(origin: Point, target: Point): Promise<LegResult> {
  "use cache";

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    cacheLife("seconds");
    return { ok: false, reason: "unavailable" };
  }

  try {
    await reserveQuota("geoapify", 1);

    const response = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "drive",
        sources: [{ location: [origin.lng, origin.lat] }],
        targets: [{ location: [target.lng, target.lat] }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Geoapify routematrix HTTP ${response.status}`);

    const items = toMatrix(await response.json(), 1);
    if (!items) throw new Error("Geoapify routematrix: bentuk respons tidak cocok");
    cacheLife("days");
    return { ok: true, leg: items[0] };
  } catch (error) {
    cacheLife("seconds");
    if (error instanceof QuotaExceededError) {
      return { ok: false, reason: "quota", resetAt: error.resetAt.toISOString() };
    }
    console.error("routes: gagal memuat Route Matrix", error);
    return { ok: false, reason: "unavailable" };
  }
}
