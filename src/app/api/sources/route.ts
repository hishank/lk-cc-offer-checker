import { connection, NextResponse } from "next/server";
import { parseJsonArray } from "@/lib/format";
import { getSourcesWithCounts } from "@/lib/sources";

/** Sources are configured in src/config/sources.ts; this endpoint is read-only. */
export async function GET() {
  await connection();
  const sources = await getSourcesWithCounts();
  return NextResponse.json(
    sources.map((source) => ({
      ...source,
      criteria: parseJsonArray(source.criteria),
    }))
  );
}
