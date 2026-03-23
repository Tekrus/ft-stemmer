import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRedisInstance } = vi.hoisted(() => {
  const mockRedisInstance = {
    get: vi.fn(),
    set: vi.fn(),
  }
  return { mockRedisInstance }
})

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => mockRedisInstance),
}))

import { kvGet, kvSet } from "@/lib/kv/client"

describe("kvGet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns parsed JSON on cache hit", async () => {
    mockRedisInstance.get.mockResolvedValue({ id: 1, name: "test" })
    const result = await kvGet("oda:test:1")
    expect(result).toEqual({ id: 1, name: "test" })
    expect(mockRedisInstance.get).toHaveBeenCalledWith("oda:test:1")
  })

  it("returns null on cache miss", async () => {
    mockRedisInstance.get.mockResolvedValue(null)
    const result = await kvGet("oda:test:999")
    expect(result).toBeNull()
  })

  it("returns null and logs on KV error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockRedisInstance.get.mockRejectedValue(new Error("KV unavailable"))
    const result = await kvGet("oda:test:1")
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe("kvSet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sets value with TTL", async () => {
    mockRedisInstance.set.mockResolvedValue("OK")
    await kvSet("oda:test:1", { id: 1 }, 1800)
    expect(mockRedisInstance.set).toHaveBeenCalledWith("oda:test:1", { id: 1 }, { ex: 1800 })
  })

  it("sets value without TTL when 0", async () => {
    mockRedisInstance.set.mockResolvedValue("OK")
    await kvSet("oda:test:1", { id: 1 }, 0)
    expect(mockRedisInstance.set).toHaveBeenCalledWith("oda:test:1", { id: 1 }, {})
  })

  it("does not throw on KV error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mockRedisInstance.set.mockRejectedValue(new Error("KV unavailable"))
    await expect(kvSet("key", "val", 100)).resolves.toBeUndefined()
  })
})
