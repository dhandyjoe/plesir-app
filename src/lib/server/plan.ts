import "server-only";
import { rangeInDays } from "@/lib/calendar";
import { getDestination } from "@/lib/destinations";
import { PlaceCategory } from "@/lib/geoapify";
import {
  AI_PLAN_JSON_SCHEMA,
  CATEGORY_LABEL,
  buildPrompt,
  toCandidates,
  topPlaces,
  toRundown,
} from "@/lib/plan";
import type { PlanResult } from "@/lib/plan-job";
import { enrichDays } from "./enrich";
import { generateJson } from "./gemini";
import { getPlaces } from "./places";
import { QuotaExceededError } from "./quota";

/** Satu panggilan awal + satu retry berisi daftar kesalahan validasi. */
export const MAX_AI_CALLS = 2;
/** 12 per kategori memangkas prompt ±1/3 dan latensi Gemini (diukur 183 dtk → 68 dtk bersama thinking "low") tanpa menurunkan kualitas rundown 3 hari. */
export const CANDIDATES_PER_CATEGORY = 12;

/**
 * Kandidat Geoapify → Gemini memilih dan menjadwalkan → validasi server.
 * Bisa memakan 1–3 menit (antrean Gemini), jadi dijalankan sebagai job di `plan-jobs.ts`, bukan saat render.
 */
export async function generatePlan(
  destinationId: string,
  start: string,
  end: string,
): Promise<PlanResult> {
  const destination = getDestination(destinationId);
  if (!destination) return { ok: false, reason: "unavailable" };
  const dayCount = rangeInDays(start, end);

  const results = await Promise.all(
    PlaceCategory.options.map((category) => getPlaces(destinationId, category)),
  );
  const candidates = toCandidates(
    Object.fromEntries(
      PlaceCategory.options.map((category, i) => {
        const result = results[i];
        return [category, result.ok ? topPlaces(result.places, CANDIDATES_PER_CATEGORY) : []];
      }),
    ),
  );
  const warnings = PlaceCategory.options
    .filter((_, i) => !results[i].ok)
    .map((category) => `Data ${CATEGORY_LABEL[category].toLowerCase()} sedang tidak dapat dimuat.`);

  // Butuh minimal 2 tempat kunjungan per hari agar rundown bermakna.
  if (candidates.filter((c) => c.category !== "penginapan").length < dayCount * 2) {
    for (const result of results) {
      if (!result.ok && result.reason === "quota") return result;
    }
    return { ok: false, reason: warnings.length ? "unavailable" : "no_places" };
  }

  let issues: string[] = [];
  try {
    for (let call = 0; call < MAX_AI_CALLS; call++) {
      const { system, user } = buildPrompt(destination.name, start, dayCount, candidates, issues);
      const json = await generateJson(system, user, AI_PLAN_JSON_SCHEMA);
      if (json === null) return { ok: false, reason: "unavailable" };

      const rundown = toRundown(json, candidates, dayCount, destination.name, { start, meals: true });
      if (rundown.ok) {
        const enriched = await enrichDays(rundown.days, new Map(candidates.map((c) => [c.id, c])));
        return { ok: true, days: enriched.days, warnings: [...warnings, ...rundown.warnings, ...enriched.warnings] };
      }
      issues = rundown.issues;
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, reason: "quota", resetAt: error.resetAt.toISOString() };
    }
    console.error("plan: gagal menyusun rencana", error);
    return { ok: false, reason: "unavailable" };
  }

  console.error("plan: output AI tetap tidak valid setelah retry", issues);
  return { ok: false, reason: "invalid" };
}
