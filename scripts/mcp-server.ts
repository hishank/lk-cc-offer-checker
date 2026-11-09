import "./mcp/bootstrap";
import "../src/lib/load-env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { extractLinks, getPageText } from "../src/lib/crawl/fetch-page";
import {
  failComparison,
  listComparisons,
  overlapSchema,
  pageOfferSchema,
  saveComparisonResult,
} from "../src/lib/comparisons";
import { getLatestOffers, saveOffersForSource } from "../src/lib/offers";
import { parseCriteria } from "../src/lib/parse-criteria";
import { findSource, getSourcesWithCounts } from "../src/lib/sources";

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const INSTRUCTIONS = `Credit card offers tracker. The web app (${APP_URL}) shows whatever you save here.

Refreshing offers: call list_sources, then for each source fetch_page (try mode "full" if "readable" misses offers; follow links for detail pages when needed), extract every offer you can see, and call save_source_offers once per source with the complete list (it replaces that source's current offers).

Comparing a link: call list_comparison_requests for links queued in the app (or use a link the user gives you). fetch_page the link, list its offers, call search_offers to find related stored offers (search by merchant, category, bank), then save_comparison with the page offers and every overlap. If the page can't be read, call mark_comparison_failed. Afterwards tell the user the comparison URL.

fetch_page cannot run JavaScript: if a page comes back nearly empty, use your own web fetch/browse tool if you have one, then save the results the same way.

Only record details that are stated on the page; use null when unknown.`;

const server = new McpServer(
  { name: "cc-offers", version: "1.0.0" },
  { instructions: INSTRUCTIONS }
);

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function guard<T>(fn: () => Promise<T>) {
  try {
    return json(await fn());
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}

server.registerTool(
  "list_sources",
  {
    title: "List offer sources",
    description:
      "List the offer pages configured in src/config/sources.ts with when they were last crawled.",
    annotations: { readOnlyHint: true },
  },
  () =>
    guard(async () =>
      (await getSourcesWithCounts()).map((source) => ({
        key: source.key ?? source.id,
        label: source.label,
        url: source.url,
        criteria: parseCriteria(source.criteria),
        lastCrawledAt: source.lastCrawledAt?.toISOString() ?? null,
        currentOffers: source.currentOffers,
      }))
    )
);

server.registerTool(
  "fetch_page",
  {
    title: "Fetch page text",
    description:
      "Fetch a web page server-side and return its text. Large pages are trimmed to sections matching `keywords` when given.",
    inputSchema: {
      url: z.string().url(),
      keywords: z.array(z.string()).optional(),
      mode: z
        .enum(["readable", "full"])
        .optional()
        .describe('"readable" = main article text (default); "full" = all visible text, better for listing pages'),
      maxChars: z.number().int().min(2000).max(100_000).optional().describe("Default 40000"),
      includeLinks: z.boolean().optional().describe("Also return the page's links"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  ({ url, keywords, mode, maxChars, includeLinks }) =>
    guard(async () => {
      const page = await getPageText(url, {
        keywords,
        mode: mode ?? "readable",
        maxChars: maxChars ?? 40_000,
      });
      return {
        url,
        totalChars: page.totalChars,
        keywordFocused: page.keywordFocused,
        text: page.excerpt,
        ...(page.totalChars < 300
          ? {
              warning:
                "Almost no text: the page is probably rendered with JavaScript or blocked. Try mode \"full\", your own web fetch tool, or tell the user the page can't be read automatically.",
            }
          : {}),
        ...(includeLinks ? { links: extractLinks(page.html, url) } : {}),
      };
    })
);

const offerInput = z.object({
  cardName: z.string().describe("Card name, or merchant/promotion title for merchant offers"),
  issuer: z.string().describe("Bank / issuer"),
  summary: z.string().describe("One or two sentence summary in your own words"),
  category: z.string().nullable().optional().describe("Short lowercase type: dining, hotel, travel, fuel, shopping, supermarket, cashback…"),
  signupBonus: z.string().nullable().optional().describe("Headline bonus or discount, e.g. '20% off' or '60,000 points'"),
  annualFee: z.string().nullable().optional(),
  apr: z.string().nullable().optional(),
  rewardsSummary: z.string().nullable().optional(),
  validity: z.string().nullable().optional(),
  offerUrl: z.string().nullable().optional(),
  perks: z.array(z.string()).optional(),
});

server.registerTool(
  "save_source_offers",
  {
    title: "Save offers for a source",
    description:
      "Save the complete current list of offers you extracted from one configured source. Replaces what the app shows for that source.",
    inputSchema: {
      source: z.string().describe("Source key from list_sources"),
      offers: z.array(offerInput),
    },
  },
  ({ source, offers }) =>
    guard(async () => {
      const row = await findSource(source);
      if (!row) throw new Error(`Unknown source "${source}". Call list_sources for valid keys.`);
      const result = await saveOffersForSource(
        row.id,
        offers.map((offer) => ({
          cardName: offer.cardName,
          issuer: offer.issuer,
          summary: offer.summary,
          category: offer.category?.toLowerCase() ?? null,
          signupBonus: offer.signupBonus ?? null,
          annualFee: offer.annualFee ?? null,
          apr: offer.apr ?? null,
          rewardsSummary: offer.rewardsSummary ?? null,
          validity: offer.validity ?? null,
          offerUrl: offer.offerUrl ?? null,
          perks: offer.perks ?? [],
        })),
        { method: "claude" }
      );
      return { ...result, viewAt: `${APP_URL}/offers?source=${encodeURIComponent(row.key ?? row.id)}` };
    })
);

server.registerTool(
  "search_offers",
  {
    title: "Search stored offers",
    description:
      "Search the current offers stored for all sources. Keywords match any field (an offer matches if any keyword appears).",
    inputSchema: {
      keywords: z.array(z.string()).optional(),
      source: z.string().optional().describe("Source key"),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional().describe("Default 100"),
    },
    annotations: { readOnlyHint: true },
  },
  ({ keywords, source, category, limit }) =>
    guard(async () =>
      (await getLatestOffers({ keywords, source, category, limit: limit ?? 100 })).map(
        (offer) => ({
          id: offer.id,
          name: offer.cardName,
          issuer: offer.issuer,
          category: offer.category,
          benefit: offer.signupBonus,
          annualFee: offer.annualFee,
          rewards: offer.rewardsSummary,
          validity: offer.validity,
          perks: offer.perks,
          summary: offer.rawSummary,
          source: offer.sourceKey ?? offer.sourceLabel,
          url: offer.offerUrl ?? offer.sourceUrl,
          crawledAt: offer.crawledAt,
        })
      )
    )
);

server.registerTool(
  "list_comparison_requests",
  {
    title: "List comparison requests",
    description: "Links submitted in the app for comparison. Defaults to pending ones.",
    inputSchema: {
      status: z.enum(["pending", "done", "failed", "all"]).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  ({ status }) =>
    guard(async () =>
      (await listComparisons(status === "all" ? undefined : (status ?? "pending"))).map(
        (row) => ({
          id: row.id,
          url: row.url,
          note: row.note,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        })
      )
    )
);

server.registerTool(
  "save_comparison",
  {
    title: "Save a link comparison",
    description:
      "Save your survey of a link: the offers on that page and how they overlap with stored offers. Pass `id` to complete a request from list_comparison_requests; omit it for a link the user gave you directly.",
    inputSchema: {
      id: z.string().optional(),
      url: z.string().url(),
      title: z.string().optional(),
      summary: z.string().describe("Short overall takeaway: what's new, what overlaps, what's better"),
      pageOffers: z.array(pageOfferSchema),
      overlaps: z.array(overlapSchema),
    },
  },
  (input) =>
    guard(async () => {
      const row = await saveComparisonResult(input);
      return { id: row.id, viewAt: `${APP_URL}/compare/${row.id}` };
    })
);

server.registerTool(
  "mark_comparison_failed",
  {
    title: "Mark comparison failed",
    description: "Record that a queued link could not be surveyed (e.g. page unreachable).",
    inputSchema: { id: z.string(), error: z.string() },
  },
  ({ id, error }) =>
    guard(async () => {
      await failComparison(id, error);
      return { id, status: "failed" };
    })
);

server.registerPrompt(
  "refresh_offers",
  {
    title: "Refresh all offers",
    description: "Survey every configured source and save the current offers.",
  },
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Refresh the offers: call list_sources, survey each source page with fetch_page, and save every offer you find with save_source_offers. Then summarise what changed.",
        },
      },
    ],
  })
);

server.registerPrompt(
  "compare_link",
  {
    title: "Compare a link",
    description: "Survey a page and compare its offers with the stored ones.",
    argsSchema: { url: z.string().optional().describe("Leave empty to process links queued in the app") },
  },
  ({ url }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: url
            ? `Survey ${url}, compare its offers against the stored offers, and save the comparison with save_comparison. Show me the overlaps.`
            : "Process the pending comparison requests from the app: survey each link, compare against stored offers, and save each with save_comparison.",
        },
      },
    ],
  })
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`cc-offers MCP server ready (app: ${APP_URL})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
