import { kvGet, kvSet } from "@/lib/kv/client"
import { config } from "@/lib/config"
import type { OdaResponse } from "./types"

type OdaSagDokument = {
  readonly id: number
  readonly sagid: number
  readonly dokumentid: number
  readonly bilagsnummer: string
  readonly frigivelsesdato: string | null
  readonly rolleid: number
  readonly Dokument?: {
    readonly id: number
    readonly titel: string
    readonly dato: string
  }
}

type OdaFil = {
  readonly id: number
  readonly dokumentid: number
  readonly titel: string
  readonly filurl: string | null
  readonly format: string | null
}

export type SagDocument = {
  readonly title: string
  readonly bilagsnummer: string
  readonly date: string | null
  readonly fileUrl: string | null
  readonly format: string | null
}

/** Fetch from ODA without caching the raw response in Redis. */
async function fetchOdaRaw<T>(path: string): Promise<T> {
  const url = `${config.oda.baseUrl}${path}${path.includes("?") ? "&" : "?"}$format=json`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`ODA API error: ${response.status} for ${path}`)
  }
  if (config.oda.requestDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.oda.requestDelayMs))
  }
  return response.json() as Promise<T>
}

/**
 * Fetch key documents for a sag — betænkninger, ændringsforslag, fremsættelse, vedtagelse.
 * Only the small processed result is cached; raw ODA responses are not stored.
 */
export async function fetchSagDocuments(sagId: number): Promise<SagDocument[]> {
  const cacheKey = `sag-docs:${sagId}`
  const cached = await kvGet<SagDocument[]>(cacheKey)
  if (cached) return cached

  const sagDocs = await fetchOdaRaw<OdaResponse<OdaSagDokument>>(
    `/SagDokument?$filter=sagid eq ${sagId}&$expand=Dokument&$orderby=frigivelsesdato desc&$top=50`
  )

  // Filter to interesting document types
  const interesting = sagDocs.value.filter((d) => {
    const titel = d.Dokument?.titel?.toLowerCase() ?? ""
    return (
      titel.includes("betænkning") ||
      titel.includes("ændringsforslag") ||
      titel.includes("fremsat") ||
      titel.includes("fremsættelse") ||
      titel.includes("vedtaget") ||
      titel.includes("tillægsbetænkning")
    )
  })

  // Fetch file URLs for the interesting documents (not cached individually)
  const documentIds = interesting
    .map((d) => d.Dokument?.id)
    .filter((id): id is number => id != null)

  const fileMap = new Map<number, OdaFil>()
  for (const docId of documentIds.slice(0, 20)) {
    const files = await fetchOdaRaw<OdaResponse<OdaFil>>(
      `/Fil?$filter=dokumentid eq ${docId}&$top=1&$orderby=versionsdato desc`
    )
    const pdfFile = files.value.find((f) => f.format === "PDF") ?? files.value[0]
    if (pdfFile) {
      fileMap.set(docId, pdfFile)
    }
  }

  const documents: SagDocument[] = interesting.map((d) => {
    const fil = d.Dokument?.id ? fileMap.get(d.Dokument.id) : undefined
    return {
      title: d.Dokument?.titel ?? "",
      bilagsnummer: d.bilagsnummer ?? "",
      date: d.frigivelsesdato,
      fileUrl: fil?.filurl ?? null,
      format: fil?.format ?? null,
    }
  })

  // Only cache the small processed result (~1-2KB)
  await kvSet(cacheKey, documents, 0)
  return documents
}
