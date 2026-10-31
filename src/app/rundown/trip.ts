const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!DATE_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Seed bentuk jalan; bila tidak ada/rusak, diturunkan dari data perjalanan agar tetap stabil. */
function parseSeed(value: string | string[] | undefined, fallbackKey: string) {
  if (typeof value === "string" && /^\d{1,10}$/.test(value)) return Number(value);
  let hash = 0;
  for (const ch of fallbackKey) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/** Mengembalikan parameter yang sudah tervalidasi, atau null bila tidak lengkap/rusak. */
export function parseTrip(params: Record<string, string | string[] | undefined>) {
  const { city, start, end, seed } = params;
  if (typeof city !== "string" || typeof start !== "string" || typeof end !== "string") return null;
  const name = city.trim();
  if (!name || name.length > 80) return null;
  if (!isValidDate(start) || !isValidDate(end) || end < start) return null;
  return { city: name, start, end, seed: parseSeed(seed, `${name}|${start}|${end}`) };
}
