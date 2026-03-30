import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
  cache: "no-cache",
})

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch (error) {
    console.error(`[KV] GET failed for key "${key}":`, error)
    return null
  }
}

export async function kvDel(pattern: string): Promise<number> {
  try {
    const keys: string[] = []
    let cursor = "0"
    do {
      const [next, batch] = await redis.scan(cursor, { match: pattern, count: 100 })
      cursor = String(next)
      keys.push(...batch)
    } while (cursor !== "0")
    if (keys.length === 0) return 0
    await redis.del(...keys)
    return keys.length
  } catch (error) {
    console.error(`[KV] DEL failed for pattern "${pattern}":`, error)
    return 0
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const options = ttlSeconds > 0 ? { ex: ttlSeconds } : {}
    await redis.set(key, value, options)
  } catch (error) {
    console.error(`[KV] SET failed for key "${key}":`, error)
  }
}
