import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/oda/client", () => ({
  fetchFromOda: vi.fn(),
  fetchSagstrin: vi.fn(),
  fetchSag: vi.fn(),
  fetchStemmer: vi.fn(),
}))

vi.mock("@/lib/oda/mapper", () => ({
  mapToVoteSummary: vi.fn((_a, _st, _s, _stemmer, type) => ({
    id: _a.id,
    type,
  })),
}))

import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"

describe("fetchVoteSummaries", () => {
  it("processes votes in parallel and returns all results in order", async () => {
    const mockAfstemninger = [
      { id: 1, sagstrinid: 10, typeid: 1 },
      { id: 2, sagstrinid: 20, typeid: 1 },
      { id: 3, sagstrinid: 30, typeid: 1 },
    ]

    vi.mocked(fetchFromOda).mockResolvedValueOnce({
      value: mockAfstemninger,
    })
    vi.mocked(fetchSagstrin).mockImplementation(async (id) => ({ sagid: id * 10 }))
    vi.mocked(fetchSag).mockImplementation(async (id) => ({ id }))
    vi.mocked(fetchStemmer).mockImplementation(async () => ({ value: [] }))

    const results = await fetchVoteSummaries(3)

    expect(results).toHaveLength(3)
    expect(results[0].id).toBe(1)
    expect(results[1].id).toBe(2)
    expect(results[2].id).toBe(3)
  })

  it("handles votes without sagstrinid", async () => {
    vi.mocked(fetchFromOda).mockResolvedValueOnce({
      value: [{ id: 1, sagstrinid: null, typeid: 1 }],
    })
    vi.mocked(fetchStemmer).mockResolvedValueOnce({ value: [] })

    const results = await fetchVoteSummaries(1)

    expect(results).toHaveLength(1)
    expect(fetchSagstrin).not.toHaveBeenCalled()
  })
})
