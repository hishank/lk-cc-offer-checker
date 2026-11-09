import { z } from "zod";
import { db } from "@/lib/db";

export const pageOfferSchema = z.object({
  name: z.string().describe("Card or offer name as shown on the page"),
  issuer: z.string().nullable().optional().describe("Bank / issuer"),
  category: z.string().nullable().optional(),
  benefit: z
    .string()
    .nullable()
    .optional()
    .describe("Headline benefit, e.g. '20% off at X' or '60,000 bonus points'"),
  validity: z.string().nullable().optional(),
  annualFee: z.string().nullable().optional(),
  details: z.string().nullable().optional().describe("Other notable terms"),
});

export const overlapSchema = z.object({
  pageOffer: z.string().describe("`name` of the page offer this overlap is about"),
  storedOfferIds: z
    .array(z.string())
    .describe("ids of stored offers (from search_offers) that overlap with it"),
  matchType: z
    .enum(["same", "similar", "competing"])
    .describe(
      "same = the same offer listed elsewhere; similar = same merchant/benefit type with different terms; competing = alternative offer for the same need"
    ),
  sharedPoints: z.array(z.string()).describe("What the offers have in common"),
  differences: z.array(z.string()).describe("How they differ (rate, cap, dates, card, fee…)"),
  verdict: z
    .string()
    .nullable()
    .optional()
    .describe("Which is better and for whom, if it can be judged"),
});

export type PageOffer = z.infer<typeof pageOfferSchema>;
export type Overlap = z.infer<typeof overlapSchema>;

function parseJson<T>(value: string, schema: z.ZodType<T>): T[] {
  try {
    const parsed = z.array(schema).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function validateUrl(url: string): string {
  const trimmed = url.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) links are supported");
  }
  return trimmed;
}

export async function createComparisonRequest(url: string, note?: string | null) {
  return db.comparison.create({
    data: { url: validateUrl(url), note: note?.trim() || null },
  });
}

export async function listComparisons(status?: string) {
  return db.comparison.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getComparison(id: string) {
  const row = await db.comparison.findUnique({ where: { id } });
  if (!row) return null;
  return {
    ...row,
    pageOffers: parseJson(row.pageOffers, pageOfferSchema),
    overlaps: parseJson(row.overlaps, overlapSchema),
  };
}

export async function saveComparisonResult(input: {
  id?: string;
  url: string;
  title?: string | null;
  summary: string;
  pageOffers: PageOffer[];
  overlaps: Overlap[];
}) {
  const data = {
    url: validateUrl(input.url),
    status: "done",
    title: input.title?.trim() || null,
    summary: input.summary,
    pageOffers: JSON.stringify(input.pageOffers),
    overlaps: JSON.stringify(input.overlaps),
    error: null,
    completedAt: new Date(),
  };

  return input.id
    ? db.comparison.update({ where: { id: input.id }, data })
    : db.comparison.create({ data });
}

export async function failComparison(id: string, error: string) {
  return db.comparison.update({
    where: { id },
    data: { status: "failed", error, completedAt: new Date() },
  });
}

export async function deleteComparison(id: string) {
  await db.comparison.delete({ where: { id } });
}
