import { NextResponse } from "next/server";
import { getLatestOffers } from "@/lib/offers";

/** Current offers. Query params: q (comma-separated keywords), source, category, limit. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || undefined;

  const offers = await getLatestOffers({
    keywords: (searchParams.get("q") ?? "").split(",").filter(Boolean),
    source: searchParams.get("source") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    limit,
  });

  return NextResponse.json(offers);
}
