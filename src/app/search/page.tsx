import { SearchBar } from "@/components/search-bar"

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Søg</h1>
        <p className="mt-1 text-muted-foreground">Find afstemninger om lovforslag i Folketinget</p>
      </header>

      <SearchBar />
    </div>
  )
}
