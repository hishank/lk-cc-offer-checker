import Link from "next/link";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/format";
import { CrawlAllButton } from "@/components/crawl-all-button";
import { OffersTable } from "@/components/offers-table";
import { SourcesTable } from "@/components/sources-table";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [sources, offers] = await Promise.all([
    db.source.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { offers: true } } },
    }),
    db.offer.findMany({
      include: { source: { select: { url: true, label: true } } },
      orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  const sourceRows = sources.map((source) => ({
    id: source.id,
    url: source.url,
    label: source.label,
    criteria: parseJsonArray(source.criteria),
    lastCrawledAt: source.lastCrawledAt?.toISOString() ?? null,
    offerCount: source._count.offers,
  }));

  const offerRows = offers.map((offer) => ({
    id: offer.id,
    cardName: offer.cardName,
    issuer: offer.issuer,
    annualFee: offer.annualFee,
    signupBonus: offer.signupBonus,
    relevanceScore: offer.relevanceScore,
    matchedCriteria: parseJsonArray(offer.matchedCriteria),
    createdAt: offer.createdAt.toISOString(),
    source: offer.source,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Crawl offer pages on demand and review matching credit card deals.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/sources"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Manage sources
          </Link>
          <CrawlAllButton disabled={sources.length === 0} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>
              {sources.length} page{sources.length === 1 ? "" : "s"} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SourcesTable sources={sourceRows.slice(0, 5)} />
            {sources.length > 5 && (
              <Link
                href="/sources"
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "mt-4 px-0"
                )}
              >
                View all sources
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent offers</CardTitle>
            <CardDescription>
              Latest extracted offers sorted by relevance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OffersTable offers={offerRows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
