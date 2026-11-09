import { getLatestOffers } from "@/lib/offers";
import { mergeCriteria, parseCriteria } from "@/lib/parse-criteria";
import { getSourcesWithCounts } from "@/lib/sources";
import { formatOffersMarkdown, type OfferResult } from "./format-results";
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
  source: { key: string | null; label: string | null; url: string; criteria: string },
  filter: string
): boolean {
  const needle = filter.toLowerCase();
  const criteria = parseCriteria(source.criteria).join(" ").toLowerCase();
  return (
    (source.key?.toLowerCase().includes(needle) ?? false) ||
    (source.label?.toLowerCase().includes(needle) ?? false) ||
    source.url.toLowerCase().includes(needle) ||
    criteria.includes(needle)
  );
}

async function getSources(sourceFilter?: string) {
  const sources = await getSourcesWithCounts();
  if (!sourceFilter?.trim()) return sources;
  const filtered = sources.filter((source) =>
    sourceMatchesFilter(source, sourceFilter.trim())
  );
  return filtered.length > 0 ? filtered : sources;
}

/** Re-score stored offers against the query keywords (most relevant first). */
function rescore(offers: OfferResult[], keywords: string[]): OfferResult[] {
  if (keywords.length === 0) return offers;
  return offers
    .map((offer) => {
      const [scored] = scoreOffers(
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
            category: offer.category,
            validity: offer.validity,
            offerUrl: offer.offerUrl,
          },
        ],
        keywords,
        { keepUnmatched: true }
      );
      return {
        ...offer,
        relevanceScore: scored.relevanceScore,
        matchedCriteria: scored.matchedCriteria,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function runAgentQuery(
  options: AgentQueryOptions
): Promise<AgentQueryResult> {
  const keywords = options.keywords.map((k) => k.trim()).filter(Boolean);
  const fresh = options.fresh ?? true;
  const errors: string[] = [];
  let sourcesCrawled = 0;

  const sources = await getSources(options.sourceFilter);
  if (sources.length === 0) {
    return {
      offers: [],
      sourcesCrawled: 0,
      errors: ["No sources configured. Add URLs to src/config/sources.ts."],
      markdown: "No sources configured. Add offer page URLs to src/config/sources.ts.",
    };
  }

  if (fresh) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local, or use --cached / the MCP server (Claude does the extraction)."
      );
    }

    for (const source of sources) {
      try {
        const mergedCriteria = mergeCriteria(parseCriteria(source.criteria), keywords);
        await crawlSource(source.id, { criteria: mergedCriteria });
        sourcesCrawled += 1;
      } catch (error) {
        const label = source.label ?? source.url;
        const message = error instanceof Error ? error.message : "Unknown crawl error";
        errors.push(`${label}: ${message}`);
      }
    }
  }

  const sourceUrls = new Set(sources.map((source) => source.url));
  const stored = await getLatestOffers({ keywords });
  const offers = rescore(
    stored.filter((offer) => sourceUrls.has(offer.sourceUrl)),
    keywords
  ).slice(0, 100);

  const queryLabel =
    keywords.length > 0 ? `${keywords.join(", ")} offers` : "All credit card offers";

  let markdown = formatOffersMarkdown(offers, queryLabel);
  if (errors.length > 0) {
    markdown += `\n\n## Crawl warnings\n\n${errors.map((e) => `- ${e}`).join("\n")}`;
  }

  return { offers, sourcesCrawled, errors, markdown };
}

export async function listSourcesMarkdown(): Promise<string> {
  const sources = await getSourcesWithCounts();

  if (sources.length === 0) {
    return "No sources configured. Add them to src/config/sources.ts.";
  }

  const lines = ["# Configured sources", ""];

  for (const source of sources) {
    const criteria = parseCriteria(source.criteria);
    lines.push(`## ${source.label ?? source.url}`);
    if (source.key) lines.push(`- **Key:** ${source.key}`);
    lines.push(`- **URL:** ${source.url}`);
    lines.push(`- **Criteria:** ${criteria.length > 0 ? criteria.join(", ") : "none"}`);
    lines.push(`- **Current offers:** ${source.currentOffers}`);
    lines.push(`- **Last crawled:** ${source.lastCrawledAt?.toISOString() ?? "never"}`);
    lines.push("");
  }

  return lines.join("\n");
}
