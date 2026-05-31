"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrawlAllButtonProps {
  disabled?: boolean;
}

export function CrawlAllButton({ disabled }: CrawlAllButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCrawlAll() {
    setLoading(true);
    const response = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      alert(data.error ?? "Crawl failed");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Button onClick={handleCrawlAll} disabled={disabled || loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Crawl all
    </Button>
  );
}
