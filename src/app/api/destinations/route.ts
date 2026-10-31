import type { NextRequest } from "next/server";
import { z } from "zod";
import { searchDestinations } from "@/lib/destinations";

const Query = z.string().trim().min(2).max(60);

export function GET(request: NextRequest) {
  const parsed = Query.safeParse(request.nextUrl.searchParams.get("q"));
  if (!parsed.success) {
    return Response.json(
      { error: "Parameter q harus 2–60 karakter." },
      { status: 400 },
    );
  }

  const destinations = searchDestinations(parsed.data).map(
    ({ id, name, province, kind }) => ({ id, name, province, kind }),
  );

  // Daftar statis (build-time), aman di-cache publik.
  return Response.json(
    { destinations },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
