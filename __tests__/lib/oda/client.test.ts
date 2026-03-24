import { describe, it, expect } from "vitest"
import { cacheKey } from "@/lib/oda/client"

describe("cacheKey", () => {
  it("uses full path with version prefix", () => {
    const key = cacheKey("/Sagstrin(123)")
    expect(key).toBe("oda:v1:/Sagstrin(123)")
  })

  it("produces different keys for different paths", () => {
    const key1 = cacheKey("/Sag(1)")
    const key2 = cacheKey("/Sag(2)")
    expect(key1).not.toBe(key2)
  })

  it("handles query string paths", () => {
    const key = cacheKey("/Stemme?$filter=afstemningid eq 5&$expand=Akt%C3%B8r&$top=200&$skip=0")
    expect(key).toBe("oda:v1:/Stemme?$filter=afstemningid eq 5&$expand=Akt%C3%B8r&$top=200&$skip=0")
  })
})
