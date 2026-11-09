import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { removeComparison } from "@/app/compare/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ClaudeHint } from "@/components/claude-hint";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getComparison, type Overlap } from "@/lib/comparisons";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ComparisonPageProps {
  params: Promise<{ id: string }>;
}

const MATCH_LABELS: Record<Overlap["matchType"], string> = {
  same: "Same offer",
  similar: "Similar offer",
  competing: "Competing offer",
};

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { id } = await params;
  const comparison = await getComparison(id);
  if (!comparison) notFound();

  const storedIds = [...new Set(comparison.overlaps.flatMap((o) => o.storedOfferIds))];
  const storedOffers = await db.offer.findMany({
    where: { id: { in: storedIds } },
    include: { source: { select: { label: true, url: true } } },
  });
  const storedById = new Map(storedOffers.map((offer) => [offer.id, offer]));

  const overlapsByOffer = new Map<string, Overlap[]>();
  for (const overlap of comparison.overlaps) {
    const list = overlapsByOffer.get(overlap.pageOffer) ?? [];
    list.push(overlap);
    overlapsByOffer.set(overlap.pageOffer, list);
  }
  const uniqueCount = comparison.pageOffers.filter((o) => !overlapsByOffer.has(o.name)).length;
  const deleteAction = removeComparison.bind(null, comparison.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {comparison.status === "pending" && <AutoRefresh />}
      <Link href="/compare" className={cn(buttonVariants({ variant: "ghost" }))}>
        ← All comparisons
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <StatusBadge status={comparison.status} />
          <h1 className="text-3xl font-semibold tracking-tight">
            {comparison.title ?? "Link comparison"}
          </h1>
          <a
            href={comparison.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 break-all text-sm text-muted-foreground hover:underline"
          >
            {comparison.url}
            <ExternalLink className="size-3 shrink-0" />
          </a>
          {comparison.note && (
            <p className="text-sm text-muted-foreground">Focus: {comparison.note}</p>
          )}
        </div>
        <form action={deleteAction}>
          <Button type="submit" variant="ghost" size="sm">
            <Trash2 className="size-4" />
            Delete
          </Button>
        </form>
      </div>

      {comparison.status === "pending" && (
        <ClaudeHint prompt="Process my pending offer comparisons">
          This page refreshes automatically once Claude saves the result.
        </ClaudeHint>
      )}

      {comparison.status === "failed" && (
        <Card>
          <CardHeader>
            <CardTitle>Claude couldn&apos;t survey this page</CardTitle>
            <CardDescription>{comparison.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {comparison.status === "done" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                {comparison.pageOffers.length} offers on the page ·{" "}
                {overlapsByOffer.size} overlapping · {uniqueCount} not found elsewhere ·
                surveyed {formatDate(comparison.completedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed">{comparison.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overlaps with your tracked offers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparison.overlaps.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No overlaps — nothing on this page matches the offers you track.
                </p>
              )}
              {comparison.overlaps.map((overlap, index) => (
                <div key={index} className="space-y-3 rounded-lg border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={overlap.matchType === "same" ? "default" : "secondary"}>
                      {MATCH_LABELS[overlap.matchType]}
                    </Badge>
                    <p className="font-medium">{overlap.pageOffer}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {overlap.storedOfferIds.map((offerId) => {
                      const stored = storedById.get(offerId);
                      if (!stored) return null;
                      return (
                        <Link
                          key={offerId}
                          href={`/offers/${offerId}`}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                        >
                          <span className="font-medium">{stored.cardName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {stored.signupBonus ?? stored.issuer} ·{" "}
                            {stored.source.label ?? stored.source.url}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <PointList title="In common" items={overlap.sharedPoints} />
                    <PointList title="Differences" items={overlap.differences} />
                  </div>
                  {overlap.verdict && (
                    <p className="text-sm">
                      <span className="font-medium">Verdict:</span> {overlap.verdict}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offers on this page</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Overlap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.pageOffers.map((offer) => {
                    const overlaps = overlapsByOffer.get(offer.name);
                    return (
                      <TableRow key={offer.name}>
                        <TableCell className="max-w-xs whitespace-normal">
                          <p className="font-medium">{offer.name}</p>
                          {offer.issuer && (
                            <p className="text-xs text-muted-foreground">{offer.issuer}</p>
                          )}
                          {offer.details && (
                            <p className="mt-1 text-xs text-muted-foreground">{offer.details}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {offer.category ? (
                            <Badge variant="secondary">{offer.category}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal text-sm">
                          {offer.benefit ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{offer.validity ?? "—"}</TableCell>
                        <TableCell>
                          {overlaps ? (
                            <div className="flex flex-wrap gap-1">
                              {overlaps.map((o, i) => (
                                <Badge key={i} variant="outline">
                                  {MATCH_LABELS[o.matchType]}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline">Only here</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PointList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-muted-foreground">{title}</p>
      <ul className="list-inside list-disc space-y-0.5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
