export type Attempt<T> = { done: true; value: T } | { done: false };

const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Kegagalan yang layak dicoba di model lain: limit, server provider sibuk/error, atau timeout.
 * Request/respons yang rusak (400, 403, JSON tidak valid) tidak membaik dengan ganti model.
 */
export const shouldFallback = (failure: { status: number } | { error: unknown }) =>
  "status" in failure
    ? TRANSIENT_STATUS.has(failure.status)
    : failure.error instanceof Error && failure.error.name === "TimeoutError";

/**
 * Coba model berurutan: lewati yang kuotanya habis (`reserve` false) atau ditolak provider karena limit (`call` → done:false).
 * Hasil model pertama yang menjawab dikembalikan apa adanya, termasuk kegagalan selain limit; done:false bila semua model terlewati.
 */
export async function withFallback<M, T>(
  models: readonly M[],
  reserve: (model: M) => Promise<boolean>,
  call: (model: M) => Promise<Attempt<T>>,
): Promise<Attempt<T>> {
  for (const model of models) {
    if (!(await reserve(model))) continue;
    const attempt = await call(model);
    if (attempt.done) return attempt;
  }
  return { done: false };
}
