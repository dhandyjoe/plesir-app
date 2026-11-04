import type { NextRequest } from "next/server";
import { z } from "zod";
import { searchDestinations } from "@/lib/destinations";

const Query = z.object({
  q: z.string().trim().min(2).max(60),
  offset: z.coerce.number().int().min(0).max(1000),
});

const PAGE_SIZE = 10;

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = Query.safeParse({ q: searchParams.get("q"), offset: searchParams.get("offset") ?? 0 });
  if (!parsed.success) {
    return Response.json(
      { error: "Parameter q harus 2–60 karakter dan offset 0–1000." },
      { status: 400 },
    );
  }

  // Minta satu lebih dari satu halaman untuk tahu masih ada halaman berikutnya.
  const found = searchDestinations(parsed.data.q, PAGE_SIZE + 1, parsed.data.offset);
  const destinations = found
    .slice(0, PAGE_SIZE)
    .map(({ id, name, province, kind }) => ({ id, name, province, kind }));

  // Daftar statis (build-time), aman di-cache publik.
  return Response.json(
    { destinations, hasMore: found.length > PAGE_SIZE },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
