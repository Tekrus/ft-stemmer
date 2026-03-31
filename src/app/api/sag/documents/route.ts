import type { NextRequest } from "next/server"
import { fetchSagDocuments } from "@/lib/oda/fetch-documents"

export async function GET(request: NextRequest) {
  const sagId = Number(request.nextUrl.searchParams.get("sagId"))

  if (!sagId || !Number.isFinite(sagId) || sagId < 1) {
    return Response.json({ error: "Invalid sagId" }, { status: 400 })
  }

  const documents = await fetchSagDocuments(sagId)
  return Response.json(documents)
}
