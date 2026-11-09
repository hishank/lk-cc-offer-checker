"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { SourceRow } from "@/lib/source-row";

export type { SourceRow };

interface SourcesTableProps {
  sources: SourceRow[];
  compact?: boolean;
}

export function SourcesTable({ sources, compact = false }: SourcesTableProps) {
  const router = useRouter();
  const [crawlingId, setCrawlingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCrawl(sourceId: string) {
    setCrawlingId(sourceId);
    const response = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      alert(data.error ?? "Crawl failed");
    }

    setCrawlingId(null);
    router.refresh();
  }

  async function handleDelete(sourceId: string) {
    if (!confirm("Delete this source and all its offers?")) return;

    setDeletingId(sourceId);
    await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sources configured. Add them to src/config/sources.ts.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          {!compact && <TableHead>Criteria</TableHead>}
          <TableHead>Last crawled</TableHead>
          <TableHead>Offers</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source) => (
          <TableRow key={source.id}>
            <TableCell>
              <div className="space-y-1">
                <p className="font-medium">
                  {source.label || new URL(source.url).hostname}
                  {!source.key && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      not in config
                    </Badge>
                  )}
                </p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                >
                  {source.url}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </TableCell>
            {!compact && (
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {source.criteria.length === 0 ? (
                  <span className="text-xs text-muted-foreground">All offers</span>
                ) : (
                  source.criteria.map((criterion) => (
                    <Badge key={criterion} variant="secondary">
                      {criterion}
                    </Badge>
                  ))
                )}
              </div>
            </TableCell>
            )}
            <TableCell className="text-sm">
              {formatDate(source.lastCrawledAt)}
            </TableCell>
            <TableCell>{source.offerCount}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCrawl(source.id)}
                  disabled={crawlingId === source.id || deletingId === source.id}
                >
                  {crawlingId === source.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Crawl
                </Button>
                {!source.key && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(source.id)}
                  disabled={deletingId === source.id}
                >
                  {deletingId === source.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
