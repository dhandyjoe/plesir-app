import type { NextRequest } from "next/server";
import { parseTrip } from "@/app/rundown/trip";
import { getPlanJob, startPlanJob } from "@/lib/server/plan-jobs";

// Job Gemini di after() butuh 1–3 menit; 300 s = batas Vercel Hobby.
export const maxDuration = 300;

const invalid = () =>
  Response.json(
    { error: "Parameter dest (ID kota/kabupaten), start, dan end wajib valid, maksimal 5 hari." },
    { status: 400 },
  );

const unavailable = () =>
  Response.json(
    { error: "Penyusunan rencana sedang tidak tersedia. Coba lagi beberapa saat lagi." },
    { status: 503 },
  );

/** Mulai (atau pakai ulang) job penyusunan rencana untuk satu destinasi dan rentang tanggal. */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const trip = body && typeof body === "object" ? parseTrip(body as Record<string, unknown>) : null;
  if (!trip) return invalid();

  try {
    return Response.json(await startPlanJob(trip));
  } catch (error) {
    console.error("plans: gagal memulai job", error);
    return unavailable();
  }
}

/** Status job untuk dipantau klien; tidak memulai pekerjaan apa pun. */
export async function GET(request: NextRequest) {
  const trip = parseTrip(Object.fromEntries(request.nextUrl.searchParams));
  if (!trip) return invalid();

  try {
    const job = await getPlanJob(trip);
    if (!job) return Response.json({ error: "Job tidak ditemukan atau kedaluwarsa." }, { status: 404 });
    return Response.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("plans: gagal membaca job", error);
    return unavailable();
  }
}
