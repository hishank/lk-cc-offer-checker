import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const minScore = searchParams.get("minScore");
  const limit = searchParams.get("limit");

  const offers = await db.offer.findMany({
    where: {
      ...(sourceId ? { sourceId } : {}),
      ...(minScore ? { relevanceScore: { gte: Number(minScore) } } : {}),
    },
    include: {
      source: { select: { url: true, label: true } },
    },
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit ? Number(limit) : undefined,
  });

  return NextResponse.json(
    offers.map((offer) => ({
      ...offer,
      perks: JSON.parse(offer.perks) as string[],
      matchedCriteria: JSON.parse(offer.matchedCriteria) as string[],
    }))
  );
}
