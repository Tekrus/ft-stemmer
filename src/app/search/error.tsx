"use client"

export default function SearchError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Søgning fejlede</h2>
      <p className="mt-2 text-muted-foreground">Der opstod en fejl under søgningen.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Prøv igen
      </button>
    </div>
  )
}
