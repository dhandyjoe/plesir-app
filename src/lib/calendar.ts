const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});
const dayLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Tanggal disimpan sebagai kunci lokal "YYYY-MM-DD" (bukan UTC) supaya tidak bergeser zona waktu.
export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, offset: number) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + offset);
  return localDateString(date);
}

// Hasilnya selalu tanggal 1 dari bulan tujuan.
export function addMonths(monthKey: string, offset: number) {
  const date = parseDateKey(monthKey);
  return localDateString(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

// Geser sebulan dengan tanggal yang sama; dijepit ke akhir bulan (31 Jan -> 28 Feb).
export function addMonthsKeepDay(key: string, offset: number) {
  const date = parseDateKey(key);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0).getDate();
  return localDateString(
    new Date(date.getFullYear(), date.getMonth() + offset, Math.min(date.getDate(), lastDay)),
  );
}

export function monthStart(key: string) {
  return `${key.slice(0, 7)}-01`;
}

// Minggu mulai Senin; `leading` = jumlah sel kosong sebelum tanggal 1.
export function monthCells(monthKey: string) {
  const date = parseDateKey(monthKey);
  const year = date.getFullYear();
  const month = date.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return {
    leading: (date.getDay() + 6) % 7,
    days: Array.from({ length: count }, (_, index) =>
      localDateString(new Date(year, month, index + 1)),
    ),
  };
}

export function rangeInDays(start: string, end: string) {
  return (
    Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86_400_000) + 1
  );
}

export function formatDate(key: string) {
  return dateFormatter.format(parseDateKey(key));
}

export function formatDateRange(start: string, end: string) {
  return end ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

export function formatMonth(monthKey: string) {
  return monthFormatter.format(parseDateKey(monthKey));
}

export function formatDayLabel(key: string) {
  return dayLabelFormatter.format(parseDateKey(key));
}
