import Link from "next/link"
import { Search, ArrowLeftRight } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-dannebrog">
            <span className="text-xs font-bold text-white leading-none">FT</span>
          </div>
          <div>
            <span className="font-heading text-base font-semibold tracking-[-0.02em]">
              Stemmer
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/compare"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sammenlign</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Søg</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
