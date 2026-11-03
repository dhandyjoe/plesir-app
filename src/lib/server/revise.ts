import "server-only";
import { PlaceCategory } from "@/lib/geoapify";
import type { ItineraryDoc, RevisionOutcome } from "@/lib/itinerary";
import {
  AI_REVISION_JSON_SCHEMA,
  buildRevisionPrompt,
  toCandidates,
  topPlaces,
  toCurrentPlan,
  toRevision,
} from "@/lib/plan";
import { enrichDays } from "./enrich";
import { generateJson } from "./gemini";
import { getPlaces } from "./places";
import { CANDIDATES_PER_CATEGORY, MAX_AI_CALLS } from "./plan";
import { QuotaExceededError } from "./quota";

/**
 * Instruksi pengguna → usulan rundown baru. Kandidat Geoapify diambil dari cache yang sama dengan penyusunan awal;
 * tempat yang sudah ada di rencana selalu ikut sebagai kandidat. Model tidak pernah menulis ke database: hasilnya hanya usulan.
 * Prompt pengguna tidak di-log.
 */
export async function revisePlan(itinerary: ItineraryDoc, instruction: string): Promise<RevisionOutcome> {
  const { dest, city, start, days, version } = itinerary;

  const results = await Promise.all(PlaceCategory.options.map((category) => getPlaces(dest, category)));
  const candidates = toCandidates(
    Object.fromEntries(
      PlaceCategory.options.map((category, i) => {
        const result = results[i];
        return [category, result.ok ? topPlaces(result.places, CANDIDATES_PER_CATEGORY) : []];
      }),
    ),
  );
  const current = toCurrentPlan(days, candidates);
  if (!current) return { kind: "error", reason: "invalid" };

  let issues: string[] = [];
  try {
    for (let call = 0; call < MAX_AI_CALLS; call++) {
      const { system, user } = buildRevisionPrompt(city, start, current, instruction, issues);
      const json = await generateJson(system, user, AI_REVISION_JSON_SCHEMA);
      if (json === null) return { kind: "error", reason: "unavailable" };

      const result = toRevision(json, current, days, city, start);
      if (!result.ok) {
        issues = result.issues;
        continue;
      }
      if (result.kind !== "proposal") return { kind: result.kind, message: result.message };
      const { summary, changes } = result;
      const enriched = await enrichDays(result.days, new Map(current.candidates.map((c) => [c.id, c])), days);
      return {
        kind: "proposal",
        proposalId: crypto.randomUUID(),
        baseVersion: version,
        days: enriched.days,
        warnings: [...result.warnings, ...enriched.warnings],
        summary,
        changes,
      };
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { kind: "error", reason: "quota", resetAt: error.resetAt.toISOString() };
    }
    console.error("revise: gagal merevisi rencana", error);
    return { kind: "error", reason: "unavailable" };
  }

  console.error("revise: output AI tetap tidak valid setelah retry", issues);
  return { kind: "error", reason: "invalid" };
}
