import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SearchBar } from "@/components/search-bar"

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tilbage
      </Link>

      <header className="mb-8">
        <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">Søg</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Find afstemninger om lovforslag i Folketinget
        </p>
      </header>

      <SearchBar />
    </div>
  )
}
