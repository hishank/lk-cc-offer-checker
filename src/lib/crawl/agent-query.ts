import { db } from "@/lib/db";
import { mergeCriteria, parseCriteria } from "@/lib/parse-criteria";
import {
  formatOffersMarkdown,
  offerFromDb,
  type OfferResult,
} from "./format-results";
import { crawlSource } from "./run-crawl";
import { scoreOffers } from "./score-offers";

export interface AgentQueryOptions {
  keywords: string[];
  fresh?: boolean;
  sourceFilter?: string;
}

export interface AgentQueryResult {
  offers: OfferResult[];
  sourcesCrawled: number;
  errors: string[];
  markdown: string;
}

function sourceMatchesFilter(
  source: { label: string | null; url: string; criteria: string },
  filter: string
): boolean {
  const needle = filter.toLowerCase();
  const criteria = parseCriteria(source.criteria).join(" ").toLowerCase();
  return (
    (source.label?.toLowerCase().includes(needle) ?? false) ||
    source.url.toLowerCase().includes(needle) ||
    criteria.includes(needle)
  );
}

function offerMatchesKeywords(offer: OfferResult, keywords: string[]): boolean {
  if (keywords.length === 0) return true;

  const text = [
    offer.cardName,
    offer.issuer,
    offer.annualFee,
    offer.signupBonus,
    offer.apr,
    offer.rewardsSummary,
    offer.rawSummary,
    ...offer.perks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

async function getSources(sourceFilter?: string) {
  const sources = await db.source.findMany({ orderBy: { createdAt: "asc" } });
  if (!sourceFilter?.trim()) return sources;
  const filtered = sources.filter((source) =>
    sourceMatchesFilter(source, sourceFilter.trim())
  );
  return filtered.length > 0 ? filtered : sources;
}

async function queryCachedOffers(keywords: string[]): Promise<OfferResult[]> {
  // Newest first, so every re-crawl supersedes older copies of the same offer.
  const offers = await db.offer.findMany({
    include: { source: { select: { url: true, label: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const seen = new Set<string>();
  const latest = offers.filter((offer) => {
    const key = [offer.sourceId, offer.cardName, offer.issuer]
      .map((part) => part.trim().toLowerCase())
      .join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return latest
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 100)
    .map(offerFromDb)
    .filter((offer) => offerMatchesKeywords(offer, keywords));
}

export async function runAgentQuery(
  options: AgentQueryOptions
): Promise<AgentQueryResult> {
  const keywords = options.keywords.map((k) => k.trim()).filter(Boolean);
  const fresh = options.fresh ?? true;
  const errors: string[] = [];
  let sourcesCrawled = 0;

  if (fresh) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local before running crawls."
      );
    }

    const sources = await getSources(options.sourceFilter);
    if (sources.length === 0) {
      return {
        offers: [],
        sourcesCrawled: 0,
        errors: ["No sources configured. Add URLs in the app at /sources first."],
        markdown: "No sources configured. Add offer page URLs in the app first.",
      };
    }

    for (const source of sources) {
      try {
        const sourceCriteria = parseCriteria(source.criteria);
        const mergedCriteria = mergeCriteria(sourceCriteria, keywords);
        await crawlSource(source.id, { criteria: mergedCriteria });
        sourcesCrawled += 1;
      } catch (error) {
        const label = source.label ?? source.url;
        const message =
          error instanceof Error ? error.message : "Unknown crawl error";
        errors.push(`${label}: ${message}`);
      }
    }
  }

  let offers = await queryCachedOffers(keywords);

  if (keywords.length > 0) {
    offers = offers
      .map((offer) => {
        const scored = scoreOffers(
          [
            {
              cardName: offer.cardName,
              issuer: offer.issuer,
              annualFee: offer.annualFee,
              signupBonus: offer.signupBonus,
              apr: offer.apr,
              rewardsSummary: offer.rewardsSummary,
              perks: offer.perks,
              summary: offer.rawSummary,
            },
          ],
          keywords
        )[0];

        if (!scored) return null;

        return {
          ...offer,
          relevanceScore: scored.relevanceScore,
          matchedCriteria: scored.matchedCriteria,
        };
      })
      .filter((offer): offer is OfferResult => offer !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  const queryLabel =
    keywords.length > 0
      ? `${keywords.join(", ")} offers`
      : "All credit card offers";

  let markdown = formatOffersMarkdown(offers, queryLabel);

  if (errors.length > 0) {
    markdown += `\n\n## Crawl warnings\n\n${errors.map((e) => `- ${e}`).join("\n")}`;
  }

  return { offers, sourcesCrawled, errors, markdown };
}

export async function listSourcesMarkdown(): Promise<string> {
  const sources = await db.source.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { offers: true } } },
  });

  if (sources.length === 0) {
    return "No sources configured.";
  }

  const lines = ["# Configured sources", ""];

  for (const source of sources) {
    const criteria = parseCriteria(source.criteria);
    lines.push(`## ${source.label ?? source.url}`);
    lines.push(`- **URL:** ${source.url}`);
    lines.push(
      `- **Criteria:** ${criteria.length > 0 ? criteria.join(", ") : "none"}`
    );
    lines.push(`- **Offers stored:** ${source._count.offers}`);
    lines.push(
      `- **Last crawled:** ${source.lastCrawledAt?.toISOString() ?? "never"}`
    );
    lines.push("");
  }

  return lines.join("\n");
}
