import type { NextRequest } from "next/server"
import { fetchRelatedSager } from "@/lib/oda/fetch-related"

export async function GET(request: NextRequest) {
  const sagstrinId = Number(request.nextUrl.searchParams.get("sagstrinId"))
  const sagId = Number(request.nextUrl.searchParams.get("sagId"))

  if (!sagstrinId || !Number.isFinite(sagstrinId) || sagstrinId < 1) {
    return Response.json({ error: "Invalid sagstrinId" }, { status: 400 })
  }

  if (!sagId || !Number.isFinite(sagId) || sagId < 1) {
    return Response.json({ error: "Invalid sagId" }, { status: 400 })
  }

  try {
    const related = await fetchRelatedSager(sagstrinId, sagId)
    return Response.json(related)
  } catch {
    return Response.json({ error: "Failed to fetch related proposals" }, { status: 500 })
  }
}
