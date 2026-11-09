import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, parseJsonArray } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OfferPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { id } = await params;

  const offer = await db.offer.findUnique({
    where: { id },
    include: { source: true, crawlRun: { select: { method: true } } },
  });

  if (!offer) {
    notFound();
  }

  const perks = parseJsonArray(offer.perks);
  const matchedCriteria = parseJsonArray(offer.matchedCriteria);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/offers" className={cn(buttonVariants({ variant: "ghost" }))}>
        ← All offers
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={offer.relevanceScore >= 70 ? "default" : "secondary"}>
            Score {offer.relevanceScore}
          </Badge>
          {matchedCriteria.map((criterion) => (
            <Badge key={criterion} variant="outline">
              {criterion}
            </Badge>
          ))}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {offer.cardName}
        </h1>
        <p className="text-muted-foreground">{offer.issuer}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Offer details</CardTitle>
          <CardDescription>
            Extracted on {formatDate(offer.createdAt)}
            {offer.crawlRun.method === "claude" ? " by Claude" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="Category" value={offer.category} />
          <DetailRow label="Benefit / bonus" value={offer.signupBonus} />
          <DetailRow label="Valid" value={offer.validity} />
          <DetailRow label="Annual fee" value={offer.annualFee} />
          <DetailRow label="APR" value={offer.apr} />
          <DetailRow label="Rewards" value={offer.rewardsSummary} />
          {perks.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Perks
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Summary
            </p>
            <p className="text-sm leading-relaxed">{offer.rawSummary}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={offer.offerUrl ?? offer.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            {offer.source.label || offer.source.url}
            <ExternalLink className="size-4" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "Not specified on page"}</p>
    </div>
  );
}
