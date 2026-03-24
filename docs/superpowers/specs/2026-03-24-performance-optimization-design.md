# Performance Optimization — Design Specification

## Overview

FT Stemmer suffers from slow page loads across all routes due to sequential ODA API fetching, missing Next.js-level caching (ISR), and unnecessary delays on Redis cache hits. This spec addresses all three with minimal code changes.

## Goals

- **Genuinely faster**: Reduce cold-cache dashboard load from ~10s to ~2-3s, warm-cache to ~200-300ms
- **Feels faster**: ISR serves pre-rendered pages from CDN edge — near-instant for repeat visitors
- **Cost-efficient**: Dramatically fewer ODA API and Redis calls by caching immutable data permanently and serving cached HTML via ISR

## Constraints

- Parliamentary vote data is immutable once recorded — safe to cache permanently
- ODA API has no documented rate limits but is a government service — respect with concurrency limits
- Stay within Vercel/Upstash free tiers
- 3-hour data freshness is acceptable for all non-interactive pages

## Changes

### 1. ISR Configuration

Replace `force-dynamic` with ISR revalidation (`revalidate = 10800`, 3 hours) on static-friendly pages. Pages that depend on user input remain dynamic.

| Route | Current | New |
|-------|---------|-----|
| `/` (dashboard) | `force-dynamic` | `revalidate = 10800` |
| `/vote/[id]` | `force-dynamic` | `revalidate = 10800` |
| `/party/[abbreviation]` | `force-dynamic` | `revalidate = 10800` |
| `/compare` | `force-dynamic` | `force-dynamic` (unchanged — depends on query params) |
| `/search` | dynamic | dynamic (unchanged — user-driven queries) |

**Config changes** in `src/lib/config.ts`:
- `revalidate.dashboard`: `1800` → `10800`
- `revalidate.voteDetail`: remove (dead code — Next.js requires static exports)
- `revalidate.dashboard`: remove (dead code — same reason)
- `cache.odaTtl`: `1800` → `10800` (rename to `odaTtlList` for clarity — only applies to list queries now)
- `cache.odaTtlHistorical`: `86400` (unchanged)

### 2. Permanent Caching of Immutable Records

Individual ODA records (Afstemning, Sagstrin, Sag, Stemme) are immutable once created. Cache them in Redis with **no TTL** — they persist until evicted or manually cleared.

| Data type | TTL |
|-----------|-----|
| List queries (latest votes, search results) | `10800` (3 hours) |
| Individual records (Sagstrin, Sag) | No TTL (permanent) |
| Individual vote records (Stemme pages) | No TTL (permanent) |
| AI summaries | No TTL (existing behavior, unchanged) |

**Implementation:** Pass `0` as TTL to `kvSet` for individual record fetches (`fetchSagstrin`, `fetchSag`, `fetchStemmer`). The KV client already handles this correctly — `kvSet` line 19: `ttlSeconds > 0 ? { ex: ttlSeconds } : {}`, so `0` means no expiry. The list endpoint in `fetchVoteSummaries` keeps the standard `config.cache.odaTtl` TTL.

**Note on `fetchStemmer`:** This function is a paginated loop (fetches `Stemme` in pages of 200 via `fetchFromOda`). Each page call must explicitly pass `0` as TTL. Currently `fetchStemmer` passes no TTL, falling back to `config.cache.odaTtl`. The fix is to pass `0` explicitly to each `fetchFromOda` call within the loop.

### 3. Parallel Fetching with Concurrency Limit

The current `fetchVoteSummaries` processes votes sequentially — each vote requires 3+ ODA requests in a chain (sagstrin → sag → stemmer). With 15 votes, that's ~45 sequential requests.

**New approach:** Process votes in parallel with a concurrency limit of 5.

```
Batch 1: Votes 1-5  (parallel, each vote's chain is sequential internally)
Batch 2: Votes 6-10 (parallel)
Batch 3: Votes 11-15 (parallel)
```

**Implementation:** Add a `pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]>` utility function (~10 lines, no external dependency). Use it in `fetchVoteSummaries` to replace the `for` loop.

`fetchComparisonVotes` calls `fetchVoteSummaries` so it inherits this improvement automatically.

### 4. Request Delay Only on Real ODA Fetches

Currently `fetchFromOda` adds a 50ms delay after **every** call, including Redis cache hits. This wastes ~750ms on a warm-cache dashboard load (15 votes × ~3 calls × 50ms delays on cache hits).

**Change:** Move `delay(config.oda.requestDelayMs)` to only fire after a real HTTP request to the ODA API, not after a Redis cache hit. The delay continues to apply on every successful HTTP response. The existing exponential backoff on 429/503 retries is sufficient for error cases — no change needed there.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/config.ts` | Update revalidation and cache TTL values |
| `src/app/page.tsx` | Replace `force-dynamic` with `revalidate = 10800` |
| `src/app/vote/[id]/page.tsx` | Add `export const revalidate = 10800` |
| `src/app/party/[abbreviation]/page.tsx` | Add `export const revalidate = 10800` |
| `src/lib/oda/client.ts` | Replace 32-bit hash cache keys with full path keys; move delay to real-fetch-only path; pass `0` TTL for `fetchSagstrin`, `fetchSag`, `fetchStemmer` (including paginated pages) |
| `src/lib/oda/fetch-votes.ts` | Replace sequential loop with `pMap` (concurrency 5) |
| `src/lib/pmap.ts` | New file: `pMap` utility function |

## Files Unchanged

- `src/app/compare/page.tsx` — stays `force-dynamic`
- `src/app/search/page.tsx` — stays dynamic
- `src/lib/ai/summarizer.ts` — caching logic unchanged
- `src/lib/oda/fetch-comparison.ts` — inherits improvement via `fetchVoteSummaries`
- `src/lib/oda/fetch-party-votes.ts` — inherits improvement via `fetchVoteSummaries`
- `src/lib/oda/mapper.ts` — no changes
- `src/lib/kv/client.ts` — already handles `0` TTL as "no expiry" (verified)

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Cold-cache dashboard | ~10s | ~2-3s |
| Warm-cache dashboard | ~2-3s | ~200-300ms |
| ISR-cached visit | N/A (force-dynamic) | Near-instant (CDN edge) |
| ODA API calls per day | High (every page render) | Low (once per record, ever) |
| Redis calls per day | High (every page render) | Low (ISR reduces server renders) |

## Risks and Mitigations

- **ODA API concurrency**: Sending 5 parallel requests instead of 1 sequential. Mitigated by the concurrency limit and the fact that most requests will hit Redis after first fetch.
- **ISR stale content**: Users see data up to 3 hours old. Acceptable per requirements.
- **Cache key collisions**: The current `cacheKey` function uses a 32-bit DJB2 hash, which risks collisions. With permanent caching, a collision means permanent data corruption. **Fix:** Replace the hash-based key with the full ODA path, e.g., `oda:/Sagstrin(123)` instead of `oda:query:a1b2c3d4`. This is safe since ODA paths are short and deterministic.
- **Permanent cache of malformed data**: If ODA returns a bad response and it gets cached permanently, there's no automatic recovery. **Mitigation:** The existing `response.ok` check prevents caching of HTTP errors. For additional safety, cache keys use a version prefix (`oda:v1:`) that can be bumped on deploy to flush all cached data if needed.
- **Upstash free tier storage (256MB)**: Permanent caching causes monotonic growth. Each vote's Stemme data (179 MPs with expanded Aktør) is ~50-100KB. With ~500 votes cached, that's ~25-50MB — well within limits. Monitor via Upstash dashboard.
- **Comparison page cold-cache**: `fetchComparisonVotes` fetches 50 votes (not 15), so cold-cache time is ~6-8s with concurrency 5. This is acceptable since the comparison page stays `force-dynamic` and most individual records will already be cached from dashboard visits.
- **`revalidate` config values become dead code**: Next.js route segment config requires static values, so `config.revalidate.*` cannot be used in page files. Remove these from `config.ts` and use hardcoded `10800` in page exports. Keep `config.cache.odaTtl` for Redis TTLs (runtime value, used in fetch logic).
