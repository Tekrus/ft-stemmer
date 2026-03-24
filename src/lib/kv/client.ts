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

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const options = ttlSeconds > 0 ? { ex: ttlSeconds } : {}
    await redis.set(key, value, options)
  } catch (error) {
    console.error(`[KV] SET failed for key "${key}":`, error)
  }
}
