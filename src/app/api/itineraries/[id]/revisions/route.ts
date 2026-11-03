import type { NextRequest } from "next/server";
import { z } from "zod";
import { MAX_INSTRUCTION, cleanInstruction } from "@/lib/plan";
import { userId } from "@/lib/server/auth";
import { startRevision } from "@/lib/server/itineraries";
import { ItineraryId, failure, invalid, unauthorized, unavailable } from "../../http";

// Revisi Gemini di after() butuh 1–3 menit; 300 s = batas Vercel Hobby.
export const maxDuration = 300;

const Body = z.object({
  prompt: z.string().max(MAX_INSTRUCTION),
  expectedVersion: z.int().min(1),
});

/** Mulai revisi lewat instruksi bahasa natural; hasilnya berupa usulan yang dipantau lewat GET /api/itineraries/[id]. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  const id = ItineraryId.safeParse((await params).id);
  if (!id.success) return failure("not_found");
  const body = Body.safeParse(await request.json().catch(() => null));
  const prompt = body.success ? cleanInstruction(body.data.prompt) : "";
  if (!body.success || prompt.length < 3) {
    return invalid(`Instruksi wajib diisi (3–${MAX_INSTRUCTION} karakter) beserta expectedVersion.`);
  }

  try {
    const result = await startRevision(id.data, uid, prompt, body.data.expectedVersion);
    return result.ok ? Response.json({ status: "running" }, { status: 202 }) : failure(result.reason);
  } catch (error) {
    console.error("itineraries: gagal memulai revisi", error);
    return unavailable();
  }
}
