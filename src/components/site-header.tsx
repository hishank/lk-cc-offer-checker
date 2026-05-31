import Link from "next/link";
import { CreditCard } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CreditCard className="size-5" />
          CC Offers Crawler
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link
            href="/sources"
            className="text-muted-foreground hover:text-foreground"
          >
            Sources
          </Link>
        </nav>
      </div>
    </header>
  );
}
