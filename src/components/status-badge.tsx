import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "done" ? "default" : status === "failed" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status === "pending" ? "waiting for Claude" : status}</Badge>;
}
