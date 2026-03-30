"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, ArrowLeftRight } from "lucide-react"

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-dannebrog">
            <span className="text-xs font-bold text-white leading-none">FT</span>
          </div>
          <span className="font-heading text-base font-semibold tracking-[-0.02em]">
            Stemmer
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          <Link
            href="/compare"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors ${
              pathname.startsWith("/compare")
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sammenlign</span>
          </Link>
          <Link
            href="/search"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors ${
              pathname.startsWith("/search")
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Søg</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
