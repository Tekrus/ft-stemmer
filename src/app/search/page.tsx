import { SearchBar } from "@/components/search-bar"

const SEARCH_SUGGESTIONS = [
  "folkepension",
  "klima",
  "udlændinge",
  "skat",
  "sundhed",
  "bolig",
]

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="mb-8 animate-fade-up">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em]">Søg i afstemninger</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Find afstemninger om lovforslag i Folketinget
          </p>
          <div className="mt-4">
            <SearchBar suggestions={SEARCH_SUGGESTIONS} />
          </div>
        </div>
      </section>
    </div>
  )
}
