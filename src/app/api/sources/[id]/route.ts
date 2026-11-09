import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/** Delete a legacy source. Configured sources are managed in src/config/sources.ts. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const existing = await db.source.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  if (existing.key) {
    return NextResponse.json(
      { error: "This source is defined in src/config/sources.ts — remove it there." },
      { status: 400 }
    );
  }

  await db.source.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
