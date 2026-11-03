import { z } from "zod";

export const ItineraryId = z.uuid();

const MESSAGES = {
  not_found: ["Rencana tidak ditemukan atau sudah kedaluwarsa.", 404],
  stale: ["Rencana sudah berubah. Muat ulang halaman lalu coba lagi.", 409],
  busy: ["Revisi sebelumnya masih berjalan.", 409],
  limit: ["Batas revisi hari ini untuk rencana ini sudah tercapai. Coba lagi besok.", 429],
  no_proposal: ["Usulan perubahan sudah tidak berlaku.", 409],
  no_history: ["Tidak ada perubahan yang bisa dibatalkan.", 409],
  limit_saved: ["Rundown tersimpan sudah 30, batas maksimal. Hapus yang lama di Rundown Tersimpan dulu.", 409],
} as const;

export const failure = (reason: keyof typeof MESSAGES) =>
  Response.json({ error: MESSAGES[reason][0] }, { status: MESSAGES[reason][1] });

export const unauthorized = () =>
  Response.json({ error: "Masuk dulu untuk mengedit atau menyimpan rundown." }, { status: 401 });

export const invalid = (error: string) => Response.json({ error }, { status: 400 });

export const unavailable = () =>
  Response.json({ error: "Layanan revisi sedang tidak tersedia. Coba lagi beberapa saat lagi." }, { status: 503 });
