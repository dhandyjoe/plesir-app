/** Server tidak punya persentase nyata (sebagian besar waktu menunggu Gemini), jadi bar ini perkiraan berbasis waktu. */
export const MAX_ESTIMATE = 95;

/** Naik cepat di awal lalu melambat; tidak pernah mencapai 100% sebelum pekerjaan benar-benar selesai. */
export function estimateProgress(elapsedMs: number, expectedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  return Math.round(MAX_ESTIMATE * (1 - Math.exp((-1.5 * elapsedMs) / expectedMs)));
}

export type Stage = { from: number; label: string };

/** Label tahap terakhir yang batas `from`-nya sudah terlewati; `stages` harus berurutan naik. */
export const stageAt = (percent: number, stages: Stage[]) =>
  (stages.findLast((stage) => stage.from <= percent) ?? stages[0]).label;
