import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/format";
import { SourceForm } from "@/components/source-form";
import { SourcesTable } from "@/components/sources-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SourcesPageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const { edit } = await searchParams;

  const sources = await db.source.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  const editingSource = edit
    ? sources.find((source) => source.id === edit)
    : undefined;

  const sourceRows = sources.map((source) => ({
    id: source.id,
    url: source.url,
    label: source.label,
    criteria: parseJsonArray(source.criteria),
    lastCrawledAt: source.lastCrawledAt?.toISOString() ?? null,
    offerCount: source._count.offers,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sources</h1>
        <p className="text-muted-foreground">
          Add offer page URLs and optional keywords to filter relevant results.
        </p>
      </div>

      <SourceForm
        initial={
          editingSource
            ? {
                id: editingSource.id,
                url: editingSource.url,
                label: editingSource.label,
                criteria: parseJsonArray(editingSource.criteria),
              }
            : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Your sources</CardTitle>
          <CardDescription>
            Crawl individual pages or use Crawl all from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourcesTable sources={sourceRows} />
        </CardContent>
      </Card>
    </div>
  );
}
