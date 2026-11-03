import type { RundownDay, RundownStop } from "./rundown";

/**
 * Salin foto dan jarak dari rundown sebelumnya ke stop yang sama (dicocokkan lewat placeId), agar revisi tidak memanggil ulang provider.
 * `fromPrev` hanya ikut bila titik sebelumnya juga sama, karena ruas bergantung pada pasangan titik. Field yang sudah terisi tidak ditimpa.
 */
export function carryOver(days: RundownDay[], previous: RundownDay[]): RundownDay[] {
  const before = new Map<string, { stop: RundownStop; prevId: string | undefined }>();
  for (const day of previous) {
    day.stops.forEach((stop, i) => {
      if (stop.placeId) before.set(stop.placeId, { stop, prevId: i ? day.stops[i - 1].placeId : day.startMarker.placeId });
    });
  }
  const lodging = days[0]?.startMarker.placeId;
  const sameLodging = !!lodging && lodging === previous[0]?.startMarker.placeId;
  const oldLodging = previous[0]?.startMarker;

  const marker = <M extends RundownDay["startMarker"]>(m: M): M =>
    sameLodging && !m.photo && oldLodging?.photo
      ? { ...m, photo: oldLodging.photo, photoCredit: oldLodging.photoCredit }
      : m;

  return days.map((day, d) => {
    const stops = day.stops.map((stop, i) => {
      const old = stop.placeId ? before.get(stop.placeId) : undefined;
      if (!old) return stop;
      const prevId = i ? day.stops[i - 1].placeId : day.startMarker.placeId;
      return {
        ...stop,
        ...(!stop.photo && old.stop.photo ? { photo: old.stop.photo, photoCredit: old.stop.photoCredit } : {}),
        ...(!stop.fromPrev && old.stop.fromPrev && prevId && prevId === old.prevId ? { fromPrev: old.stop.fromPrev } : {}),
      };
    });
    // Ruas pulang bergantung pada stop terakhir dan penginapan penutup yang sama.
    const last = day.stops.at(-1)?.placeId;
    const oldDay = previous[d];
    const finish = marker(day.finishMarker);
    const keepFinish =
      !finish.fromPrev && oldDay?.finishMarker.fromPrev && last && last === oldDay.stops.at(-1)?.placeId &&
      day.finishMarker.placeId && day.finishMarker.placeId === oldDay.finishMarker.placeId;
    return {
      ...day,
      startMarker: marker(day.startMarker),
      finishMarker: keepFinish ? { ...finish, fromPrev: oldDay.finishMarker.fromPrev } : finish,
      stops,
    };
  });
}
