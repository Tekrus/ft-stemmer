import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Siden blev ikke fundet</h2>
      <p className="mt-2 text-muted-foreground">Den side du leder efter findes ikke.</p>
      <Link href="/" className="mt-4 inline-block text-primary underline hover:no-underline">
        Gå til forsiden
      </Link>
    </div>
  )
}
