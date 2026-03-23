import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/kv/client", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}))

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => model),
}))

import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import { kvGet, kvSet } from "@/lib/kv/client"
import { generateText } from "ai"

describe("getOrGenerateSummary", () => {
  const input = {
    sagId: 100,
    titel: "Test bill",
    resume: "This is a test resume",
    nummer: "L 42",
    lovnummer: "123",
    lovnummerdato: "2026-01-01",
    vedtaget: true,
    totals: { for: 80, against: 30, absent: 5, abstained: 2, total: 117 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("returns cached summary when hash matches", async () => {
    const expectedHash = "1lei8dirtfx"

    vi.mocked(kvGet).mockResolvedValue({
      summary: "Cached summary",
      model: "test-model",
      resumeHash: expectedHash,
      createdAt: "2026-01-01",
    })

    const result = await getOrGenerateSummary(input)
    expect(result).toBe("Cached summary")
    expect(generateText).not.toHaveBeenCalled()
  })

  it("generates new summary on cache miss", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    vi.mocked(generateText).mockResolvedValue({ text: "New AI summary" } as any)

    const result = await getOrGenerateSummary(input)
    expect(result).toBe("New AI summary")
    expect(kvSet).toHaveBeenCalled()
  })

  it("falls back to next model when first fails", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error("Model not found"))
      .mockResolvedValueOnce({ text: "Fallback summary" } as any)

    const result = await getOrGenerateSummary(input)
    expect(result).toBe("Fallback summary")
    expect(generateText).toHaveBeenCalledTimes(2)
  })

  it("returns null when all models fail", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    vi.mocked(generateText).mockRejectedValue(new Error("AI unavailable"))

    const result = await getOrGenerateSummary(input)
    expect(result).toBeNull()
  })
})
