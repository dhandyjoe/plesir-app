import "server-only";
import { z } from "zod";
import { shouldFallback, withFallback } from "@/lib/model-fallback";
import { quotaResetAt, type QuotaProvider } from "@/lib/quota";
import { QuotaExceededError, reserveQuota } from "./quota";

const Response = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
        }),
      }),
    )
    .min(1),
});

type Model = { id: string; quota: QuotaProvider; thinking: boolean; timeoutMs: number };

/**
 * Urutan prioritas: Flash Lite (free tier 500 RPD, biasanya lebih cepat) lalu 3.8 Flash (20 RPD, sering antre lewat 150 dtk)
 * bila kuota harian habis, Google membalas 429/5xx, atau timeout. Kuota dan thinking melekat pada modelnya, bukan posisinya.
 * Flash Lite tanpa thinkingConfig: dokumentasi resmi belum menjamin thinkingLevel untuk Flash Lite, dan parameter yang tidak dikirim tidak bisa ditolak.
 */
const models = (): Model[] => [
  { id: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", quota: "gemini_lite", thinking: false, timeoutMs: 60_000 },
  { id: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.8-flash", quota: "gemini", thinking: true, timeoutMs: 90_000 },
];

const COOLDOWN_MS = 10 * 60_000;
/** Model yang barusan timeout/5xx dilewati sementara agar request berikutnya tidak menunggu timeout yang sama lagi. */
// shortcut: per instance server dan hilang saat restart; pindah ke Firestore bila berjalan di >1 instance.
const cooldownUntil = new Map<string, number>();

/** Reservasi kuota model; error selain kuota (mis. Firestore) dilempar ke pemanggil. */
const reserve = (model: Model) =>
  reserveQuota(model.quota, 1).then(
    () => true,
    (error: unknown) => {
      if (error instanceof QuotaExceededError) return false;
      throw error;
    },
  );

/**
 * Minta output JSON terstruktur dari Gemini Developer API (REST, tanpa SDK).
 * Mengembalikan null bila key kosong, provider gagal, atau JSON rusak; prompt tidak pernah di-log.
 * Melempar QuotaExceededError hanya bila kuota semua model habis atau semuanya ditolak 429.
 */
export async function generateJson(
  system: string,
  user: string,
  schema: Record<string, unknown>,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("gemini: GEMINI_API_KEY kosong");
    return null;
  }

  // true bila ada model terlewat karena sibuk/timeout (bukan kuota), termasuk yang sedang cooldown.
  let unavailable = false;
  const available = async (model: Model) => {
    if ((cooldownUntil.get(model.id) ?? 0) <= Date.now()) return reserve(model);
    unavailable = true;
    return false;
  };
  const skip = (model: Model, cause: string) => {
    console.error(`gemini: ${model.id} ${cause}, mencoba model cadangan`);
    if (cause !== "kena limit") {
      unavailable = true;
      cooldownUntil.set(model.id, Date.now() + COOLDOWN_MS);
    }
    return { done: false } as const;
  };

  const attempt = await withFallback(models(), available, async (model) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.id)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              // Memilih dari daftar kandidat tidak butuh penalaran panjang; "low" memangkas latensi.
              ...(model.thinking && { thinkingConfig: { thinkingLevel: "low" } }),
              responseMimeType: "application/json",
              responseJsonSchema: schema,
            },
          }),
          signal: AbortSignal.timeout(model.timeoutMs),
        },
      );
      if (shouldFallback(response)) {
        return skip(model, response.status === 429 ? "kena limit" : `HTTP ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`Gemini HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const { candidates } = Response.parse(await response.json());
      const text = candidates[0].content.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("");
      return { done: true, value: JSON.parse(text) as unknown };
    } catch (error) {
      if (shouldFallback({ error })) return skip(model, `timeout ${model.timeoutMs / 1000} dtk`);
      console.error(`gemini: ${model.id} gagal menghasilkan JSON`, error);
      return { done: true, value: null };
    }
  });

  if (attempt.done) return attempt.value;
  // Tampilkan "tidak tersedia", bukan "kuota habis", bila penyebabnya bukan kuota.
  if (unavailable) return null;
  throw new QuotaExceededError("gemini", quotaResetAt(new Date()));
}
