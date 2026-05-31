"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SourceFormProps {
  initial?: {
    id: string;
    url: string;
    label: string | null;
    criteria: string[];
  };
}

export function SourceForm({ initial }: SourceFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [criteriaText, setCriteriaText] = useState(
    initial?.criteria.join(", ") ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const criteria = criteriaText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      url,
      label: label || undefined,
      criteria,
    };

    const response = await fetch(
      initial ? `/api/sources/${initial.id}` : "/api/sources",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to save source");
      setLoading(false);
      return;
    }

    setUrl("");
    setLabel("");
    setCriteriaText("");
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Edit source" : "Add source"}</CardTitle>
        <CardDescription>
          Paste a credit card offer page URL and optional keywords to filter
          results (comma-separated).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Page URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/credit-cards"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              placeholder="Chase travel offers"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteria">Search criteria (optional)</Label>
            <Textarea
              id="criteria"
              placeholder="travel, no annual fee, $500 bonus, Chase"
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : initial ? "Update source" : "Add source"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
