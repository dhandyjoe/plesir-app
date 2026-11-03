import type { NextRequest } from "next/server";
import { z } from "zod";
import { userId } from "@/lib/server/auth";
import {
  applyRevision,
  deleteItinerary,
  getItinerary,
  saveItinerary,
  undoLastRevision,
} from "@/lib/server/itineraries";
import { ItineraryId, failure, invalid, unauthorized, unavailable } from "../http";

type Context = { params: Promise<{ id: string }> };

/** Keadaan terbaru (rundown, versi, dan revisi yang sedang berjalan atau usulannya) untuk dipantau klien. */
export async function GET(request: NextRequest, { params }: Context) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  const id = ItineraryId.safeParse((await params).id);
  if (!id.success) return failure("not_found");

  try {
    const view = await getItinerary(id.data, uid);
    if (!view) return failure("not_found");
    return Response.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("itineraries: gagal membaca", error);
    return unavailable();
  }
}

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply"), proposalId: z.uuid(), expectedVersion: z.int().min(1) }),
  z.object({ action: z.literal("undo"), expectedVersion: z.int().min(1) }),
  z.object({ action: z.literal("save") }),
]);

/** Terapkan usulan revisi atau batalkan perubahan terakhir (hanya untuk `expectedVersion`), atau simpan ke Rundown Tersimpan. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  const id = ItineraryId.safeParse((await params).id);
  if (!id.success) return failure("not_found");
  const body = Action.safeParse(await request.json().catch(() => null));
  if (!body.success) return invalid("Aksi tidak dikenal atau data tidak lengkap.");

  try {
    const action = body.data;
    const result =
      action.action === "apply"
        ? await applyRevision(id.data, uid, action.proposalId, action.expectedVersion)
        : action.action === "undo"
          ? await undoLastRevision(id.data, uid, action.expectedVersion)
          : await saveItinerary(id.data, uid);
    return result.ok ? Response.json(result.view) : failure(result.reason);
  } catch (error) {
    console.error("itineraries: gagal memperbarui", error);
    return unavailable();
  }
}

/** Hapus permanen dari Rundown Tersimpan. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const uid = await userId(request);
  if (!uid) return unauthorized();
  const id = ItineraryId.safeParse((await params).id);
  if (!id.success) return failure("not_found");

  try {
    return (await deleteItinerary(id.data, uid)) ? new Response(null, { status: 204 }) : failure("not_found");
  } catch (error) {
    console.error("itineraries: gagal menghapus", error);
    return unavailable();
  }
}
