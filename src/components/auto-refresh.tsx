"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch server data periodically while something is pending. */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
