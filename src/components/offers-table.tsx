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
import { formatDate } from "@/lib/format";

export interface OfferRow {
  id: string;
  cardName: string;
  issuer: string;
  annualFee: string | null;
  signupBonus: string | null;
  relevanceScore: number;
  matchedCriteria: string[];
  createdAt: string;
  source: {
    url: string;
    label: string | null;
  };
}

interface OffersTableProps {
  offers: OfferRow[];
  showSource?: boolean;
}

export function OffersTable({ offers, showSource = true }: OffersTableProps) {
  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No offers yet. Add sources and run a crawl to see results.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Card</TableHead>
          <TableHead>Bonus</TableHead>
          <TableHead>Annual fee</TableHead>
          <TableHead>Score</TableHead>
          {showSource && <TableHead>Source</TableHead>}
          <TableHead>Found</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((offer) => (
          <TableRow key={offer.id}>
            <TableCell>
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
            <TableCell className="text-sm">
              {offer.signupBonus ?? "—"}
            </TableCell>
            <TableCell className="text-sm">{offer.annualFee ?? "—"}</TableCell>
            <TableCell>
              <Badge
                variant={offer.relevanceScore >= 70 ? "default" : "secondary"}
              >
                {offer.relevanceScore}
              </Badge>
            </TableCell>
            {showSource && (
              <TableCell>
                <a
                  href={offer.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                >
                  {offer.source.label || new URL(offer.source.url).hostname}
                  <ExternalLink className="size-3" />
                </a>
              </TableCell>
            )}
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(offer.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
