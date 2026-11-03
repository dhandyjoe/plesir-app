import { z } from "zod";

/** Estimasi berkendara satu ruas antar dua titik berurutan (jarak lewat jalan, bukan garis lurus). */
export type Leg = { meters: number; seconds: number };

const Cell = z.object({ distance: z.number().nullable(), time: z.number().nullable() });
const Matrix = z.object({ sources_to_targets: z.array(z.array(z.unknown())) });

/**
 * Respons Geoapify Route Matrix untuk satu sumber → `Leg` per target, sesuai urutan target.
 * Null bila bentuk respons salah atau jumlah target tidak cocok (jangan menebak pasangan); sel tanpa rute menjadi `null`.
 */
export function toMatrix(json: unknown, targetCount: number): (Leg | null)[] | null {
  const parsed = Matrix.safeParse(json);
  const row = parsed.success ? parsed.data.sources_to_targets[0] : undefined;
  if (!row || row.length !== targetCount) return null;
  return row.map((raw) => {
    const cell = Cell.safeParse(raw);
    if (!cell.success || cell.data.distance == null || cell.data.time == null) return null;
    return { meters: cell.data.distance, seconds: cell.data.time };
  });
}

const km = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const kmShort = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** Selalu km: "0,85 km • 3 mnt", "3,2 km • 9 mnt", "42 km • 1 j 5 mnt". */
export function formatLeg({ meters, seconds }: Leg): string {
  const distance = `${(meters < 1000 ? kmShort : km).format(meters / 1000)} km`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = hours ? `${hours} j${rest ? ` ${rest} mnt` : ""}` : `${minutes} mnt`;
  return `${distance} • ${time}`;
}
