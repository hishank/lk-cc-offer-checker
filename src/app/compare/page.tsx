import { connection } from "next/server";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { ClaudeHint } from "@/components/claude-hint";
import { CompareForm } from "@/components/compare-form";
import { StatusBadge } from "@/components/status-badge";
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
import { listComparisons } from "@/lib/comparisons";
import { formatDate } from "@/lib/format";

export default async function ComparePage() {
  // Data lives in SQLite and changes all the time: render per request.
  await connection();

  const comparisons = await listComparisons();
  const hasPending = comparisons.some((c) => c.status === "pending");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {hasPending && <AutoRefresh />}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Compare a link</h1>
        <p className="text-muted-foreground">
          Give a link to any offers page. Claude surveys it, compares its offers with
          the ones you track, and the overlaps show up here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader>
            <CardTitle>New comparison</CardTitle>
            <CardDescription>The link is queued until Claude picks it up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CompareForm />
            <ClaudeHint prompt="Process my pending offer comparisons">
              Or skip the queue and just paste the link to Claude: &ldquo;Compare the offers on
              &lt;link&gt;&rdquo;.
            </ClaudeHint>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            {comparisons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comparisons yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-sm whitespace-normal">
                        <Link href={`/compare/${c.id}`} className="hover:underline">
                          <p className="font-medium">{c.title ?? c.url}</p>
                          {c.title && (
                            <p className="truncate text-xs text-muted-foreground">{c.url}</p>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
