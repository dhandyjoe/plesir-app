import type { RundownDay } from "./rundown";

export type PlanResult =
  | { ok: true; days: RundownDay[]; warnings: string[] }
  | { ok: false; reason: "quota"; resetAt: string }
  | { ok: false; reason: "unavailable" | "no_places" | "invalid" };

/** `elapsedMs`: sudah berapa lama job berjalan, supaya klien yang memuat ulang melanjutkan progress tanpa bergantung pada selisih jam. */
export type PlanJob = { status: "running"; elapsedMs?: number } | { status: "finished"; result: PlanResult };

/** Bentuk dokumen `planJobs/{dest}_{start}_{end}` di Firestore (server saja). */
export type PlanJobDoc = PlanJob & { updatedAt: number };

/** Rencana sukses dipakai ulang selama ini agar kunjungan ulang tidak memanggil Gemini lagi. */
export const RESULT_TTL_MS = 6 * 60 * 60_000;
/** Lebih lama dari 2 panggilan Gemini, masing-masing utama + cadangan (2 × (60 + 90) dtk); job "running" setua ini dianggap macet (mis. server restart). */
export const RUNNING_STALE_MS = 6 * 60_000;

/** Job yang masih berlaku, atau null bila belum ada, macet, atau hasil suksesnya kedaluwarsa. Hasil gagal tetap dikembalikan agar bisa ditampilkan. */
export function currentJob(doc: PlanJobDoc | undefined, now: number): PlanJob | null {
  if (!doc) return null;
  const age = now - doc.updatedAt;
  if (doc.status === "running") return age < RUNNING_STALE_MS ? { status: "running", elapsedMs: age } : null;
  if (doc.result.ok && age >= RESULT_TTL_MS) return null;
  // Hasil dari sebelum placeId ada tidak bisa direvisi; anggap kedaluwarsa agar disusun ulang.
  if (doc.result.ok && !doc.result.days.every((day) => day.stops.every((stop) => stop.placeId))) return null;
  return { status: "finished", result: doc.result };
}

/** Job perlu dijalankan (ulang) bila tidak ada yang berlaku atau hasil sebelumnya gagal. */
export const needsRun = (job: PlanJob | null) =>
  !job || (job.status === "finished" && !job.result.ok);
