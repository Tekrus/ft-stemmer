import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/oda/client", () => ({
  fetchFromOda: vi.fn(),
  fetchSagstrin: vi.fn(),
  fetchSag: vi.fn(),
  fetchStemmerRaw: vi.fn(),
  fetchPeriode: vi.fn(),
}))

vi.mock("@/lib/oda/mapper", () => ({
  mapStemmeToPartyVotes: vi.fn(() => ({
    partyVotes: [],
    totals: { for: 0, against: 0, absent: 0, abstained: 0, total: 0 },
  })),
  mapToVoteSummary: vi.fn((_a, _st, _s, _pv, _t, type) => ({
    id: _a.id,
    type,
  })),
}))

vi.mock("@/lib/kv/client", () => ({
  kvGet: vi.fn().mockResolvedValue(null),
  kvSet: vi.fn().mockResolvedValue(undefined),
}))

import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmerRaw } from "@/lib/oda/client"

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
    vi.mocked(fetchStemmerRaw).mockImplementation(async () => ({ value: [] }))

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
    vi.mocked(fetchStemmerRaw).mockResolvedValueOnce({ value: [] })

    const results = await fetchVoteSummaries(1)

    expect(results).toHaveLength(1)
    expect(fetchSagstrin).not.toHaveBeenCalled()
  })
})
