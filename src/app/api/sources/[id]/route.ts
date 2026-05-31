import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    url?: string;
    label?: string;
    criteria?: string[];
  };

  const existing = await db.source.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (body.url) {
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  const source = await db.source.update({
    where: { id },
    data: {
      url: body.url?.trim(),
      label: body.label !== undefined ? body.label.trim() || null : undefined,
      criteria:
        body.criteria !== undefined
          ? JSON.stringify(body.criteria)
          : undefined,
    },
  });

  return NextResponse.json({
    ...source,
    criteria: JSON.parse(source.criteria) as string[],
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const existing = await db.source.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  await db.source.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
