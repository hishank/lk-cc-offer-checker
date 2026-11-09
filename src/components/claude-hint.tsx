import { Bot } from "lucide-react";

export function ClaudeHint({ prompt, children }: { prompt: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-3 text-sm">
      <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <p>
          Ask Claude (with the <code className="font-mono">cc-offers</code> MCP server):{" "}
          <span className="font-medium">&ldquo;{prompt}&rdquo;</span>
        </p>
        {children && <p className="text-muted-foreground">{children}</p>}
      </div>
    </div>
  );
}
