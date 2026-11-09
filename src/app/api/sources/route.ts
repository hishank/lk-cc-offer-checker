import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();
  const sources = await db.source.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { offers: true } },
    },
  });

  return NextResponse.json(
    sources.map((source) => ({
      ...source,
      criteria: JSON.parse(source.criteria) as string[],
      offerCount: source._count.offers,
    }))
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    url?: string;
    label?: string;
    criteria?: string[];
  };

  if (!body.url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const source = await db.source.create({
    data: {
      url: body.url.trim(),
      label: body.label?.trim() || null,
      criteria: JSON.stringify(body.criteria ?? []),
    },
  });

  return NextResponse.json({
    ...source,
    criteria: JSON.parse(source.criteria) as string[],
  });
}
