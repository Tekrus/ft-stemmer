"use client"

export default function VoteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Kunne ikke hente afstemning</h2>
      <p className="mt-2 text-muted-foreground">Der opstod en fejl ved hentning af afstemningsdata.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Prøv igen
      </button>
    </div>
  )
}
