import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/kv/client", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}))

vi.mock("@/lib/config", () => ({
  config: {
    oda: {
      baseUrl: "https://oda.ft.dk/api",
      requestDelayMs: 0,
    },
    cache: {
      odaTtl: 1800,
      odaTtlHistorical: 86400,
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { fetchFromOda } from "@/lib/oda/client"
import { kvGet, kvSet } from "@/lib/kv/client"

describe("fetchFromOda", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns cached data on KV hit", async () => {
    const cached = { value: [{ id: 1 }] }
    vi.mocked(kvGet).mockResolvedValue(cached)

    const result = await fetchFromOda("/Afstemning?$top=1")
    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("fetches from ODA on cache miss and caches result", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    const odaResponse = { value: [{ id: 1 }] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(odaResponse),
    })

    const result = await fetchFromOda("/Afstemning?$top=1")
    expect(result).toEqual(odaResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(kvSet).toHaveBeenCalled()
  })

  it("retries on 503 with backoff", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ value: [] }) })

    const promise = fetchFromOda("/Afstemning?$top=1")
    await vi.advanceTimersByTimeAsync(2000)

    const result = await promise
    expect(result).toEqual({ value: [] })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("throws after max retries", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    mockFetch.mockResolvedValue({ ok: false, status: 503 })

    const promise = fetchFromOda("/Afstemning?$top=1")

    // Catch immediately to prevent unhandled rejection
    const resultPromise = promise.catch((e: Error) => e)
    await vi.advanceTimersByTimeAsync(20000)

    const result = await resultPromise
    expect(result).toBeInstanceOf(Error)
  })
})
