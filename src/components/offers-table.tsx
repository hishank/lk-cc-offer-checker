import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfferResult } from "@/lib/crawl/format-results";
import { formatDate } from "@/lib/format";

export interface OfferRow {
  id: string;
  cardName: string;
  issuer: string;
  category: string | null;
  benefit: string | null;
  validity: string | null;
  relevanceScore: number;
  matchedCriteria: string[];
  createdAt: string;
  source: { url: string; label: string | null };
  url: string;
}

export function toOfferRow(offer: OfferResult): OfferRow {
  return {
    id: offer.id,
    cardName: offer.cardName,
    issuer: offer.issuer,
    category: offer.category,
    benefit: offer.signupBonus ?? offer.rewardsSummary,
    validity: offer.validity,
    relevanceScore: offer.relevanceScore,
    matchedCriteria: offer.matchedCriteria,
    createdAt: offer.crawledAt,
    source: { url: offer.sourceUrl, label: offer.sourceLabel },
    url: offer.offerUrl ?? offer.sourceUrl,
  };
}

interface OffersTableProps {
  offers: OfferRow[];
  showSource?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function OffersTable({
  offers,
  showSource = true,
  compact = false,
  emptyMessage = "No offers yet. Ask Claude to refresh offers, or run a crawl.",
}: OffersTableProps) {
  if (offers.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Offer</TableHead>
          {!compact && <TableHead>Category</TableHead>}
          <TableHead>Benefit</TableHead>
          {!compact && <TableHead>Valid</TableHead>}
          <TableHead>Score</TableHead>
          {showSource && <TableHead>Source</TableHead>}
          {!compact && <TableHead>Found</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((offer) => (
          <TableRow key={offer.id}>
            <TableCell className="max-w-xs whitespace-normal">
              <Link href={`/offers/${offer.id}`} className="hover:underline">
                <p className="font-medium">{offer.cardName}</p>
                <p className="text-xs text-muted-foreground">{offer.issuer}</p>
              </Link>
              {offer.matchedCriteria.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {offer.matchedCriteria.map((criterion) => (
                    <Badge key={criterion} variant="outline" className="text-xs">
                      {criterion}
                    </Badge>
                  ))}
                </div>
              )}
            </TableCell>
            {!compact && (
              <TableCell>
                {offer.category ? (
                  <Badge variant="secondary">{offer.category}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            )}
            <TableCell className="max-w-xs whitespace-normal text-sm">
              {offer.benefit ?? "—"}
            </TableCell>
            {!compact && (
              <TableCell className="max-w-[12rem] whitespace-normal text-sm">
                {offer.validity ?? "—"}
              </TableCell>
            )}
            <TableCell>
              <Badge variant={offer.relevanceScore >= 70 ? "default" : "secondary"}>
                {offer.relevanceScore}
              </Badge>
            </TableCell>
            {showSource && (
              <TableCell>
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                >
                  {offer.source.label || hostname(offer.source.url)}
                  <ExternalLink className="size-3" />
                </a>
              </TableCell>
            )}
            {!compact && (
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(offer.createdAt)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
