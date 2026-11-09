import Link from "next/link";
import { OffersTable, toOfferRow } from "@/components/offers-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLatestOffers, getOfferCategories } from "@/lib/offers";
import { getSourcesWithCounts } from "@/lib/sources";
import { cn } from "@/lib/utils";

interface AllOffersPageProps {
  searchParams: Promise<{ q?: string; source?: string; category?: string }>;
}

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AllOffersPage({ searchParams }: AllOffersPageProps) {
  const { q = "", source = "", category = "" } = await searchParams;
  const keywords = q.split(",").map((k) => k.trim()).filter(Boolean);

  const [offers, sources, categories] = await Promise.all([
    getLatestOffers({ keywords, source, category }),
    getSourcesWithCounts(),
    getOfferCategories(),
  ]);

  const filtered = Boolean(q || source || category);
  const countsBySource = new Map<string, number>();
  for (const offer of offers) {
    const label = offer.sourceLabel ?? offer.sourceUrl;
    countsBySource.set(label, (countsBySource.get(label) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">All offers</h1>
        <p className="text-muted-foreground">
          Every offer currently listed across your sources (latest crawl of each).
        </p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/offers">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search: hotel, dining, 20% off… (comma-separated)"
          className="sm:max-w-sm"
        />
        <select name="source" defaultValue={source} className={selectClass} aria-label="Source">
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.key ?? s.id}>
              {s.label ?? s.url}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          className={selectClass}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
          Filter
        </button>
        {filtered && (
          <Link href="/offers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Clear
          </Link>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            {offers.length} offer{offers.length === 1 ? "" : "s"}
            {countsBySource.size > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {[...countsBySource].map(([label, n]) => `${label}: ${n}`).join(" · ")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OffersTable
            offers={offers.map(toOfferRow)}
            emptyMessage={
              filtered
                ? "No offers match these filters."
                : "No offers yet. Ask Claude to refresh offers (MCP), or use Crawl on the Sources page."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
