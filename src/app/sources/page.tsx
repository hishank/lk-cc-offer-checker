import { connection } from "next/server";
import { SourcesTable } from "@/components/sources-table";
import { toSourceRow } from "@/lib/source-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSourcesWithCounts } from "@/lib/sources";

export default async function SourcesPage() {
  await connection();
  const sources = await getSourcesWithCounts();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sources</h1>
        <p className="text-muted-foreground">
          Offer pages are defined in{" "}
          <code className="rounded bg-muted px-1 font-mono text-sm">src/config/sources.ts</code>.
          Edit that file to add, remove or update a URL when a bank changes its site — keep
          the <code className="font-mono">key</code> the same to preserve history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured sources</CardTitle>
          <CardDescription>
            Ask Claude to refresh offers, or use Crawl to extract with OpenAI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourcesTable sources={sources.map(toSourceRow)} />
        </CardContent>
      </Card>
    </div>
  );
}
