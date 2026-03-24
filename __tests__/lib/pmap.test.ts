import { describe, it, expect, vi } from "vitest"
import { pMap } from "@/lib/pmap"

describe("pMap", () => {
  it("maps all items through the async function", async () => {
    const result = await pMap([1, 2, 3], async (n) => n * 2, 5)
    expect(result).toEqual([2, 4, 6])
  })

  it("preserves input order regardless of completion order", async () => {
    const delays = [30, 10, 20]
    const result = await pMap(
      delays,
      async (ms, i) => {
        await new Promise((r) => setTimeout(r, ms))
        return i
      },
      5
    )
    expect(result).toEqual([0, 1, 2])
  })

  it("respects concurrency limit", async () => {
    let running = 0
    let maxRunning = 0

    await pMap(
      [1, 2, 3, 4, 5, 6],
      async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise((r) => setTimeout(r, 10))
        running--
      },
      2
    )

    expect(maxRunning).toBe(2)
  })

  it("returns empty array for empty input", async () => {
    const result = await pMap([], async (n: number) => n, 5)
    expect(result).toEqual([])
  })

  it("propagates errors from the mapper function", async () => {
    await expect(
      pMap([1, 2, 3], async (n) => {
        if (n === 2) throw new Error("fail")
        return n
      }, 5)
    ).rejects.toThrow("fail")
  })
})
