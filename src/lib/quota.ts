export type QuotaProvider = "geoapify" | "gemini" | "gemini_lite";

/**
 * Batas pemakaian harian yang dijaga server Plesir, per provider.
 * Geoapify: 80% dari 3.000 credit/hari paket Free, sisanya cadangan.
 * Gemini: request generateContent per model; free tier AI Studio (RPD): 3.8 Flash 20, 3.5 Flash Lite 500. Sisakan sedikit cadangan; cek ulang di AI Studio bila batas berubah.
 */
export const DAILY_BUDGET: Record<QuotaProvider, number> = {
  geoapify: 2400,
  gemini: 18,
  gemini_lite: 450,
};

// shortcut: hari kuota dihitung UTC (asumsi reset Geoapify 00:00 UTC = 07:00 WIB; Gemini sebenarnya reset tengah malam Pacific), ubah bila dashboard provider menunjukkan jam reset lain atau sering kena 429.
export function quotaDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function quotaResetAt(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}
