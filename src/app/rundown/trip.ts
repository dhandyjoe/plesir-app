import { MAX_TRIP_DAYS, rangeInDays } from "../../lib/calendar.ts";
import { DESTINATION_ID, getDestination } from "../../lib/destinations.ts";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!DATE_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Seed bentuk jalan; bila tidak ada/rusak, diturunkan dari data perjalanan agar tetap stabil. */
function parseSeed(value: unknown, fallbackKey: string) {
  if (typeof value === "string" && /^\d{1,10}$/.test(value)) return Number(value);
  let hash = 0;
  for (const ch of fallbackKey) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Mengembalikan parameter yang sudah tervalidasi, atau null bila tidak lengkap/rusak.
 * Nama kota diambil dari daftar destinasi berdasarkan `dest`, bukan dari query `city` yang bisa diubah bebas.
 */
export function parseTrip(params: Record<string, unknown>) {
  const { dest, start, end, seed } = params;
  if (typeof dest !== "string" || typeof start !== "string" || typeof end !== "string") return null;
  const destination = DESTINATION_ID.test(dest) ? getDestination(dest) : undefined;
  if (!destination) return null;
  if (!isValidDate(start) || !isValidDate(end) || end < start) return null;
  if (rangeInDays(start, end) > MAX_TRIP_DAYS) return null;
  return {
    dest,
    city: destination.name,
    start,
    end,
    seed: parseSeed(seed, `${dest}|${start}|${end}`),
  };
}
