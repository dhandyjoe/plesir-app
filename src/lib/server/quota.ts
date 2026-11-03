import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { DAILY_BUDGET, quotaDay, quotaResetAt, type QuotaProvider } from "@/lib/quota";
import { db } from "./firestore";

export class QuotaExceededError extends Error {
  resetAt: Date;

  constructor(provider: QuotaProvider, resetAt: Date) {
    super(`Kuota harian ${provider} habis.`);
    this.resetAt = resetAt;
  }
}

/**
 * Lapis 2: pesan kuota provider hari ini secara atomik sebelum memanggil API.
 * Unit tetap terhitung walau request ke provider gagal — sengaja, agar hitungan tidak pernah di bawah pemakaian nyata.
 */
export async function reserveQuota(provider: QuotaProvider, units: number, now = new Date()) {
  // Env (GEOAPIFY_DAILY_BUDGET / GEMINI_DAILY_BUDGET) hanya boleh menurunkan budget, untuk uji; nilai rusak = 0 (gagal tertutup).
  const max = DAILY_BUDGET[provider];
  const raw = process.env[`${provider.toUpperCase()}_DAILY_BUDGET`];
  const budget = raw ? Math.min(Number(raw) || 0, max) : max;
  const firestore = db();
  const ref = firestore.doc(`quotaUsage/${provider}-${quotaDay(now)}`);

  await firestore.runTransaction(async (tx) => {
    const used: number = (await tx.get(ref)).get("used") ?? 0;
    if (used + units > budget) throw new QuotaExceededError(provider, quotaResetAt(now));
    tx.set(ref, { used: used + units, updatedAt: FieldValue.serverTimestamp() });
  });
}
