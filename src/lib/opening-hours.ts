export type OpenStatus = "open" | "closed" | "unknown";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const RANGE = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;
const hhmm = (t: string) => t.padStart(5, "0");

/** Indeks hari (0 = Su) yang dicakup "Mo-Fr", "Sa,Su", "Fr-Mo"; null bila ada token yang tidak dikenal. */
function daySet(spec: string): Set<number> | null {
  const set = new Set<number>();
  for (const part of spec.split(",")) {
    const [from, to = from] = part.trim().split("-").map((d) => DAYS.indexOf(d.trim()));
    if (from < 0 || to < 0) return null;
    for (let d = from; ; d = (d + 1) % 7) {
      set.add(d);
      if (d === to) break;
    }
  }
  return set;
}

/**
 * Apakah tempat buka pada `date` (YYYY-MM-DD) saat kunjungan dimulai pukul `start` (HH:MM), menurut tag OSM `opening_hours`.
 * `closed` hanya bila data jelas menunjukkan tutup; data kosong atau pola yang tidak dikenali menjadi `unknown`, bukan tebakan.
 * shortcut: hanya pola umum ("Mo-Fr 08:00-17:00; Sa 08:00-12:00", "24/7", "off"); libur (PH/SH) diabaikan, jam lewat tengah malam,
 * pekan/bulan, dan "sunrise" jadi unknown. Naikkan ke paket `opening_hours` bila terlalu banyak unknown.
 */
export function openStatus(hours: string | null, date: string, start: string): OpenStatus {
  const text = hours?.trim();
  if (!text) return "unknown";
  if (text === "24/7") return "open";

  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  let ranges: [string, string][] | null = null; // null = belum ada aturan untuk hari ini
  for (const rule of text.split(";")) {
    const match = /^\s*(?:([A-Za-z][A-Za-z,\- ]*?)\s+)?(off|closed|\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*)\s*$/.exec(rule);
    if (!match) return "unknown";
    const [, days, times] = match;
    if (days && /^(PH|SH)(\s*,\s*(PH|SH))*$/.test(days)) continue;
    const applies = days ? daySet(days) : new Set(DAYS.keys());
    if (!applies) return "unknown";
    const parsed = times === "off" || times === "closed" ? [] : times.split(",").map((r) => RANGE.exec(r.trim()));
    // Jam lewat tengah malam di hari mana pun bisa menggeser hari lain, jadi seluruh string dianggap tak pasti.
    if (parsed.some((r) => !r || hhmm(r[2]) <= hhmm(r[1]))) return "unknown";
    if (applies.has(weekday)) ranges = parsed.map((r) => [hhmm(r![1]), hhmm(r![2])]);
  }
  if (ranges === null) return "closed";
  const at = hhmm(start);
  return ranges.some(([from, to]) => at >= from && at < to) ? "open" : "closed";
}
