import type { NextRequest } from "next/server";
import { z } from "zod";
import { DESTINATION_ID, getDestination } from "@/lib/destinations";
import { PLACES_ATTRIBUTION, PlaceCategory } from "@/lib/geoapify";
import { getPlaces } from "@/lib/server/places";

const Query = z.object({
  destination: z.string().regex(DESTINATION_ID),
  category: PlaceCategory,
});

const wibTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = Query.safeParse({
    destination: searchParams.get("destination"),
    category: searchParams.get("category"),
  });
  if (!parsed.success || !getDestination(parsed.data.destination)) {
    return Response.json(
      {
        error:
          "Parameter destination (ID kota/kabupaten/kawasan) dan category (penginapan, makan, kafe, wisata) wajib valid.",
      },
      { status: 400 },
    );
  }

  const result = await getPlaces(parsed.data.destination, parsed.data.category);
  if (result.ok) {
    return Response.json({ places: result.places, attribution: PLACES_ATTRIBUTION });
  }

  if (result.reason === "quota") {
    const resetAt = new Date(result.resetAt);
    return Response.json(
      {
        error: `Kuota pencarian tempat hari ini sudah habis. Coba lagi setelah pukul ${wibTime.format(resetAt)} WIB.`,
        resetAt: result.resetAt,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))),
        },
      },
    );
  }

  return Response.json(
    { error: "Data tempat sedang tidak tersedia. Coba lagi beberapa saat lagi." },
    { status: 503 },
  );
}
