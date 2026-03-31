import type { NextRequest } from "next/server"
import { fetchSagSponsors } from "@/lib/oda/fetch-sponsors"

export async function GET(request: NextRequest) {
  const sagId = Number(request.nextUrl.searchParams.get("sagId"))

  if (!sagId || !Number.isFinite(sagId) || sagId < 1) {
    return Response.json({ error: "Invalid sagId" }, { status: 400 })
  }

  try {
    const sponsors = await fetchSagSponsors(sagId)
    return Response.json(sponsors)
  } catch {
    return Response.json({ error: "Failed to fetch sponsors" }, { status: 500 })
  }
}
