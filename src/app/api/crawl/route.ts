import { NextResponse } from "next/server";
import { crawlAllSources, crawlSource } from "@/lib/crawl/run-crawl";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sourceId?: string;
  };

  try {
    if (body.sourceId) {
      const result = await crawlSource(body.sourceId);
      return NextResponse.json({ success: true, ...result });
    }

    const results = await crawlAllSources();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crawl failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
