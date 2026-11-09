import { connection } from "next/server";
import Link from "next/link";
import { CrawlAllButton } from "@/components/crawl-all-button";
import { ClaudeHint } from "@/components/claude-hint";
import { OffersTable, toOfferRow } from "@/components/offers-table";
import { SourcesTable } from "@/components/sources-table";
import { toSourceRow } from "@/lib/source-row";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listComparisons } from "@/lib/comparisons";
import { getLatestOffers } from "@/lib/offers";
import { getSourcesWithCounts } from "@/lib/sources";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  // Data lives in SQLite and changes all the time: render per request.
  await connection();

  const [sources, offers, comparisons] = await Promise.all([
    getSourcesWithCounts(),
    getLatestOffers(),
    listComparisons(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {offers.length} current offers across {sources.length} sources.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/offers" className={cn(buttonVariants())}>
            View all offers
          </Link>
          <Link href="/compare" className={cn(buttonVariants({ variant: "outline" }))}>
            Compare a link
          </Link>
          <CrawlAllButton disabled={sources.length === 0} />
        </div>
      </div>

      <ClaudeHint prompt="Refresh my credit card offers">
        Claude surveys every source in src/config/sources.ts and the results appear here.
        &ldquo;Crawl all&rdquo; does the same with OpenAI if you set OPENAI_API_KEY.
      </ClaudeHint>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top offers</CardTitle>
            <CardDescription>Highest relevance first</CardDescription>
          </CardHeader>
          <CardContent>
            <OffersTable offers={offers.slice(0, 15).map(toOfferRow)} compact />
            {offers.length > 15 && (
              <Link href="/offers" className={cn(buttonVariants({ variant: "link" }), "mt-4 px-0")}>
                See all {offers.length} offers
              </Link>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
              <CardDescription>Configured in src/config/sources.ts</CardDescription>
            </CardHeader>
            <CardContent>
              <SourcesTable sources={sources.map(toSourceRow)} compact />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent comparisons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comparisons.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  None yet. <Link href="/compare" className="underline">Compare a link</Link>.
                </p>
              )}
              {comparisons.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/compare/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="truncate">{c.title ?? c.url}</span>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
