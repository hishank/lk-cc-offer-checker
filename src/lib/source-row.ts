import { parseJsonArray } from "@/lib/format";

export interface SourceRow {
  id: string;
  key: string | null;
  url: string;
  label: string | null;
  criteria: string[];
  lastCrawledAt: string | null;
  offerCount: number;
}

export function toSourceRow(source: {
  id: string;
  key: string | null;
  url: string;
  label: string | null;
  criteria: string;
  lastCrawledAt: Date | null;
  currentOffers: number;
}): SourceRow {
  return {
    id: source.id,
    key: source.key,
    url: source.url,
    label: source.label,
    criteria: parseJsonArray(source.criteria),
    lastCrawledAt: source.lastCrawledAt?.toISOString() ?? null,
    offerCount: source.currentOffers,
  };
}
