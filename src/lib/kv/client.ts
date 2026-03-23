import { kv } from "@vercel/kv"

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key)
  } catch (error) {
    console.error(`[KV] GET failed for key "${key}":`, error)
    return null
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const options = ttlSeconds > 0 ? { ex: ttlSeconds } : {}
    await kv.set(key, value, options)
  } catch (error) {
    console.error(`[KV] SET failed for key "${key}":`, error)
  }
}
