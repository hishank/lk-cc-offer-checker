"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { requestComparison, type CompareFormState } from "@/app/compare/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompareForm() {
  const [state, action, pending] = useActionState<CompareFormState, FormData>(
    requestComparison,
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="url">Offer page link</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://www.example-bank.lk/promotions/hotel-offers"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">What should Claude focus on? (optional)</Label>
        <Input id="note" name="note" placeholder="e.g. hotel and dining offers only" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        Queue for Claude
      </Button>
    </form>
  );
}
