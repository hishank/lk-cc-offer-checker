import { db } from "@/lib/db";
import { offerFromDb, type OfferResult } from "@/lib/crawl/format-results";
import { scoreOffers, type ExtractedOffer } from "@/lib/crawl/score-offers";
import { parseCriteria } from "@/lib/parse-criteria";
import { syncConfiguredSources } from "@/lib/sources";

export interface OfferQuery {
  /** Free-text keywords; an offer matches if any keyword appears in it. */
  keywords?: string[];
  /** Source key (from src/config/sources.ts) or source id. */
  source?: string;
  category?: string;
  limit?: number;
}

function offerText(offer: OfferResult): string {
  return [
    offer.cardName,
    offer.issuer,
    offer.annualFee,
    offer.signupBonus,
    offer.apr,
    offer.rewardsSummary,
    offer.rawSummary,
    offer.category,
    offer.validity,
    ...offer.perks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function offerMatchesKeywords(
  offer: OfferResult,
  keywords: string[]
): boolean {
  const terms = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) return true;
  const text = offerText(offer);
  return terms.some((term) => text.includes(term));
}

/**
 * Offers currently available: those from each source's most recent
 * successful crawl, so expired offers drop off after a re-crawl.
 */
export async function getLatestOffers(
  query: OfferQuery = {}
): Promise<OfferResult[]> {
  await syncConfiguredSources();

  const sourceFilter = query.source?.trim();
  const sources = await db.source.findMany({
    where: sourceFilter
      ? { OR: [{ key: sourceFilter }, { id: sourceFilter }] }
      : undefined,
    select: {
      crawlRuns: {
        where: { status: "success" },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  const runIds = sources.flatMap((source) => source.crawlRuns.map((r) => r.id));

  const latest = await db.offer.findMany({
    where: { crawlRunId: { in: runIds } },
    include: { source: { select: { key: true, url: true, label: true } } },
    orderBy: { createdAt: "desc" },
  });

  const category = query.category?.trim().toLowerCase();
  const offers = latest
    .map(offerFromDb)
    .filter((offer) => offerMatchesKeywords(offer, query.keywords ?? []))
    .filter(
      (offer) => !category || offer.category?.toLowerCase() === category
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return query.limit ? offers.slice(0, query.limit) : offers;
}

export async function getOfferCategories(): Promise<string[]> {
  const rows = await db.offer.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return rows
    .map((row) => row.category!)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Store a fresh set of offers for a source as a new crawl run.
 * All offers are kept (scored against criteria, not filtered by them).
 */
export async function saveOffersForSource(
  sourceId: string,
  offers: ExtractedOffer[],
  options: {
    method: "openai" | "claude";
    criteria?: string[];
    /** Complete an existing "running" crawl run instead of creating one. */
    crawlRunId?: string;
  }
) {
  const source = await db.source.findUniqueOrThrow({ where: { id: sourceId } });
  const criteria = options.criteria ?? parseCriteria(source.criteria);
  const scored = scoreOffers(offers, criteria, { keepUnmatched: true });
  const now = new Date();

  const runData = { method: options.method, status: "success", finishedAt: now };
  const crawlRun = options.crawlRunId
    ? await db.crawlRun.update({ where: { id: options.crawlRunId }, data: runData })
    : await db.crawlRun.create({ data: { ...runData, sourceId } });

  if (scored.length > 0) {
    await db.offer.createMany({
      data: scored.map((offer) => ({
        crawlRunId: crawlRun.id,
        sourceId,
        cardName: offer.cardName,
        issuer: offer.issuer,
        annualFee: offer.annualFee,
        signupBonus: offer.signupBonus,
        apr: offer.apr,
        rewardsSummary: offer.rewardsSummary,
        perks: JSON.stringify(offer.perks),
        rawSummary: offer.summary,
        category: offer.category,
        validity: offer.validity,
        offerUrl: offer.offerUrl,
        relevanceScore: offer.relevanceScore,
        matchedCriteria: JSON.stringify(offer.matchedCriteria),
      })),
    });
  }

  await db.source.update({
    where: { id: sourceId },
    data: { lastCrawledAt: now },
  });

  return { crawlRunId: crawlRun.id, offersFound: scored.length };
}
