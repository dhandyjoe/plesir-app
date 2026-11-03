import type { NextRequest } from "next/server";
import { parseTrip } from "@/app/rundown/trip";
import { userId } from "@/lib/server/auth";
import { createItinerary, listSaved } from "@/lib/server/itineraries";
import { failure, invalid, unauthorized, unavailable } from "./http";

/** Daftar Rundown Tersimpan milik pengguna (ringkasan, bukan jadwal lengkap). */
export async function GET(request: NextRequest) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  try {
    return Response.json(await listSaved(uid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("itineraries: gagal membaca daftar", error);
    return unavailable();
  }
}

/** Salin hasil rencana yang sudah selesai menjadi itinerary yang bisa direvisi lewat prompt; `save: true` sekaligus menyimpannya. */
export async function POST(request: NextRequest) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  const body: unknown = await request.json().catch(() => null);
  const trip = body && typeof body === "object" ? parseTrip(body as Record<string, unknown>) : null;
  if (!trip) return invalid("Parameter dest (ID kota/kabupaten), start, dan end wajib valid, maksimal 5 hari.");
  const save = (body as { save?: unknown }).save;
  if (save !== undefined && typeof save !== "boolean") return invalid("Parameter save harus boolean.");

  try {
    const view = await createItinerary(trip, uid, save === true);
    if (view === "limit_saved") return failure(view);
    if (!view) {
      return Response.json(
        { error: "Rencana belum selesai disusun atau perlu disusun ulang sebelum bisa direvisi." },
        { status: 409 },
      );
    }
    return Response.json(view, { status: 201 });
  } catch (error) {
    console.error("itineraries: gagal membuat", error);
    return unavailable();
  }
}
