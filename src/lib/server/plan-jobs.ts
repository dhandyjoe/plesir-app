import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import {
  RESULT_TTL_MS,
  currentJob,
  needsRun,
  type PlanJob,
  type PlanJobDoc,
  type PlanResult,
} from "@/lib/plan-job";
import { db } from "./firestore";
import { generatePlan } from "./plan";

type Trip = { dest: string; start: string; end: string };

const jobRef = ({ dest, start, end }: Trip) => db().doc(`planJobs/${dest}_${start}_${end}`);
/** Untuk TTL policy Firestore (opsional, diatur di console); tanpa policy, dokumen lama hanya diabaikan. */
const expiresAt = (now: number) => Timestamp.fromMillis(now + RESULT_TTL_MS);

export async function getPlanJob(trip: Trip): Promise<PlanJob | null> {
  const snapshot = await jobRef(trip).get();
  return currentJob(snapshot.data() as PlanJobDoc | undefined, Date.now());
}

/**
 * Satu job per (destinasi, tanggal). Transaksi memastikan request bersamaan tidak memanggil Gemini dua kali;
 * pekerjaan berjalan di `after()` setelah respons terkirim, lalu klien memantau lewat getPlanJob.
 */
export async function startPlanJob(trip: Trip): Promise<PlanJob> {
  const ref = jobRef(trip);
  const now = Date.now();
  const existing = await db().runTransaction(async (tx) => {
    const job = currentJob((await tx.get(ref)).data() as PlanJobDoc | undefined, now);
    if (!needsRun(job)) return job;
    tx.set(ref, { status: "running", updatedAt: now, expiresAt: expiresAt(now) });
    return null;
  });
  if (existing) return existing;

  after(() => runPlanJob(trip));
  return { status: "running", elapsedMs: 0 };
}

async function runPlanJob(trip: Trip) {
  const result: PlanResult = await generatePlan(trip.dest, trip.start, trip.end).catch(
    (error: unknown) => {
      console.error("plan-jobs: generatePlan gagal", error);
      return { ok: false, reason: "unavailable" } as const;
    },
  );
  const now = Date.now();
  // Bila penyimpanan gagal, job tetap "running" lalu dianggap macet setelah RUNNING_STALE_MS dan bisa diulang.
  await jobRef(trip)
    .set({ status: "finished", result, updatedAt: now, expiresAt: expiresAt(now) })
    .catch((error: unknown) => console.error("plan-jobs: gagal menyimpan hasil", error));
}
