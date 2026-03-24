# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FT Stemmer genuinely faster across all pages by switching to ISR, parallelizing ODA API fetches, permanently caching immutable data, and removing unnecessary delays on cache hits.

**Architecture:** Replace `force-dynamic` with ISR (3-hour revalidation) on all non-interactive pages. Parallelize the sequential vote-fetching loop with a concurrency-limited `pMap`. Cache individual ODA records permanently in Redis (they never change). The 50ms polite delay already only fires on real HTTP requests (not cache hits) — no change needed there.

**Tech Stack:** Next.js App Router (ISR), Upstash Redis, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-performance-optimization-design.md`

**Note on spec deviation:** The spec says `cache.odaTtlHistorical` is "unchanged", but since all individual record fetches now use TTL 0 (permanent), this config key becomes dead code and is removed. The spec also claims the delay fires on cache hits — after code review, the delay already only fires after real HTTP responses. No delay logic change is needed.

**Note on server actions:** The `load-more.ts` server action calls `fetchVoteSummaries` and runs on-demand (not cached by ISR). It benefits from parallel fetching and permanent record caching but will still hit Redis/ODA on every click. This is expected.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/pmap.ts` | Create | Concurrency-limited parallel map utility |
| `__tests__/lib/pmap.test.ts` | Create | Tests for pMap |
| `src/lib/config.ts` | Modify | Remove dead config, rename odaTtl, update values |
| `src/lib/oda/client.ts` | Modify | Fix cache keys, add fetchAfstemning, TTL params |
| `__tests__/lib/oda/client.test.ts` | Create | Tests for cache key changes |
| `src/lib/oda/fetch-votes.ts` | Modify | Use pMap for parallel fetching |
| `__tests__/lib/oda/fetch-votes.test.ts` | Create | Tests for parallel fetching |
| `src/app/page.tsx` | Modify | Switch to ISR |
| `src/app/vote/[id]/page.tsx` | Modify | Switch to ISR, use fetchAfstemning |
| `src/app/party/[abbreviation]/page.tsx` | Modify | Switch to ISR |

---

### Task 1: Create pMap Utility

**Files:**
- Create: `src/lib/pmap.ts`
- Create: `__tests__/lib/pmap.test.ts`

- [ ] **Step 1: Write failing tests for pMap**

Create `__tests__/lib/pmap.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/pmap.test.ts`
Expected: FAIL — cannot find module `@/lib/pmap`

- [ ] **Step 3: Implement pMap**

Create `src/lib/pmap.ts`:

```typescript
export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  )
  await Promise.all(workers)

  return results
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/pmap.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pmap.ts __tests__/lib/pmap.test.ts
git commit -m "feat: add pMap concurrency-limited parallel map utility"
```

---

### Task 2: Update Config

Remove dead `revalidate` config values, remove `odaTtlHistorical`, and rename `odaTtl` to `odaTtlList` with 3-hour TTL. This must happen before modifying files that reference config keys.

**Files:**
- Modify: `src/lib/config.ts`

- [ ] **Step 1: Update config.ts**

Replace entire `src/lib/config.ts`:

Old:
```typescript
export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 50),
  },
  revalidate: {
    dashboard: Number(process.env.REVALIDATE_DASHBOARD ?? 1800),
    voteDetail: Number(process.env.REVALIDATE_VOTE_DETAIL ?? 3600),
  },
  cache: {
    odaTtl: Number(process.env.ODA_CACHE_TTL ?? 1800),
    odaTtlHistorical: Number(process.env.ODA_CACHE_TTL_HISTORICAL ?? 86400),
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 15),
  },
  ai: {
    modelOverride: process.env.AI_MODEL ?? null,
  },
}
```

New:
```typescript
export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 50),
  },
  cache: {
    /** TTL for list/search queries (seconds). Individual records use TTL 0 (permanent). */
    odaTtlList: Number(process.env.ODA_CACHE_TTL ?? 10800),
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 15),
  },
  ai: {
    modelOverride: process.env.AI_MODEL ?? null,
  },
}
```

- [ ] **Step 2: Search for remaining references to old config keys**

Run: `grep -rn "config.revalidate\|config.cache.odaTtl[^L]\|odaTtlHistorical" src/`

Fix any references found. Known references:
- `src/lib/oda/client.ts` line 38: `config.cache.odaTtl` — will be fixed in Task 3
- `src/lib/oda/client.ts` lines 58, 64: `config.cache.odaTtlHistorical` — will be fixed in Task 3

Do NOT fix these yet (Task 3 handles them). Just note them.

- [ ] **Step 3: Commit**

```bash
git add src/lib/config.ts
git commit -m "refactor: remove dead config values, rename odaTtl to odaTtlList (3h)"
```

---

### Task 3: Fix Cache Keys and TTLs in ODA Client

Replace the 32-bit hash cache keys with full-path keys (collision-safe for permanent caching). Add `fetchAfstemning` wrapper. Update all TTL references.

**Files:**
- Modify: `src/lib/oda/client.ts`
- Create: `__tests__/lib/oda/client.test.ts`

- [ ] **Step 1: Write failing tests for new cache key function**

Create `__tests__/lib/oda/client.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/oda/client.test.ts`
Expected: FAIL — `cacheKey` is not exported or returns wrong format

- [ ] **Step 3: Rewrite client.ts**

Replace full contents of `src/lib/oda/client.ts`:

```typescript
import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"

const MAX_RETRIES = 3
const RETRY_STATUS_CODES = [429, 503]

export function cacheKey(path: string): string {
  return `oda:v1:${path}`
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchFromOda<T>(path: string, ttl?: number): Promise<T> {
  const key = cacheKey(path)
  const cached = await kvGet<T>(key)
  if (cached) return cached

  const url = `${config.oda.baseUrl}${path}${path.includes("?") ? "&" : "?"}$format=json`

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await delay(Math.pow(2, attempt - 1) * 1000)
    }

    const response = await fetch(url)

    if (response.ok) {
      const data = (await response.json()) as T
      await kvSet(key, data, ttl ?? config.cache.odaTtlList)
      if (config.oda.requestDelayMs > 0) {
        await delay(config.oda.requestDelayMs)
      }
      return data
    }

    if (RETRY_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
      lastError = new Error(`ODA API returned ${response.status}`)
      continue
    }

    throw new Error(`ODA API error: ${response.status} for ${path}`)
  }

  throw lastError ?? new Error(`ODA API failed after ${MAX_RETRIES} retries`)
}

export async function fetchAfstemning(id: number) {
  return fetchFromOda<import("./types").OdaAfstemning>(
    `/Afstemning(${id})`,
    0
  )
}

export async function fetchSagstrin(id: number) {
  return fetchFromOda<import("./types").OdaSagstrin>(
    `/Sagstrin(${id})`,
    0
  )
}

export async function fetchSag(id: number) {
  return fetchFromOda<import("./types").OdaSag>(
    `/Sag(${id})`,
    0
  )
}

export async function fetchStemmer(afstemningId: number) {
  const pageSize = 200
  const allStemmer: import("./types").OdaStemme[] = []
  let skip = 0

  while (true) {
    const response = await fetchFromOda<{ value: import("./types").OdaStemme[] }>(
      `/Stemme?$filter=afstemningid eq ${afstemningId}&$expand=Akt%C3%B8r&$top=${pageSize}&$skip=${skip}`,
      0
    )
    allStemmer.push(...response.value)
    if (response.value.length < pageSize) break
    skip += pageSize
  }

  return { value: allStemmer }
}
```

Key changes from original:
- `cacheKey`: full-path with `oda:v1:` prefix (exported for testing)
- `fetchFromOda`: `config.cache.odaTtl` → `config.cache.odaTtlList`
- `fetchAfstemning`: new wrapper with TTL 0 (permanent)
- `fetchSagstrin`: `config.cache.odaTtlHistorical` → `0`
- `fetchSag`: `config.cache.odaTtlHistorical` → `0`
- `fetchStemmer`: added `0` TTL to each paginated `fetchFromOda` call

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/oda/client.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Verify no broken references**

Run: `grep -rn "config.cache.odaTtl[^L]\|odaTtlHistorical\|config.revalidate" src/`
Expected: No matches

- [ ] **Step 6: Commit**

```bash
git add src/lib/oda/client.ts __tests__/lib/oda/client.test.ts
git commit -m "fix: use full-path cache keys, add fetchAfstemning, permanent TTL for immutable records"
```

---

### Task 4: Parallelize fetchVoteSummaries

Replace the sequential `for` loop with `pMap` for concurrent vote processing.

**Files:**
- Modify: `src/lib/oda/fetch-votes.ts`
- Create: `__tests__/lib/oda/fetch-votes.test.ts`

- [ ] **Step 1: Write failing tests for parallel fetching**

Create `__tests__/lib/oda/fetch-votes.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify current behavior**

Run: `npx vitest run __tests__/lib/oda/fetch-votes.test.ts`
Expected: Tests should pass with the current sequential implementation too (they test correctness, not parallelism)

- [ ] **Step 3: Replace sequential loop with pMap in fetch-votes.ts**

Replace entire `src/lib/oda/fetch-votes.ts`:

```typescript
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "./client"
import { mapToVoteSummary } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import { pMap } from "@/lib/pmap"
import type { OdaAfstemning, OdaResponse } from "./types"
import type { VoteSummary } from "@/types/vote"

const FETCH_CONCURRENCY = 5

export async function fetchVoteSummaries(top: number, skip = 0): Promise<VoteSummary[]> {
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$top=${top}&$skip=${skip}&$orderby=opdateringsdato desc`
  )

  return pMap(
    response.value,
    async (afstemning) => {
      const sagstrin = afstemning.sagstrinid
        ? await fetchSagstrin(afstemning.sagstrinid)
        : null
      const sag = sagstrin
        ? await fetchSag(sagstrin.sagid)
        : null
      const stemmerResponse = await fetchStemmer(afstemning.id)

      return mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        stemmerResponse.value,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    },
    FETCH_CONCURRENCY
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/oda/fetch-votes.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/oda/fetch-votes.ts __tests__/lib/oda/fetch-votes.test.ts
git commit -m "perf: parallelize vote fetching with concurrency limit of 5"
```

---

### Task 5: Switch Pages to ISR

Replace `force-dynamic` with `revalidate = 10800` on dashboard, vote detail, and party pages. Update vote detail to use `fetchAfstemning` wrapper.

**Files:**
- Modify: `src/app/page.tsx:9`
- Modify: `src/app/vote/[id]/page.tsx:4,14,23`
- Modify: `src/app/party/[abbreviation]/page.tsx:8`

- [ ] **Step 1: Update dashboard page**

In `src/app/page.tsx`, replace line 9:

Old:
```typescript
export const dynamic = "force-dynamic"
```

New:
```typescript
export const revalidate = 10800
```

- [ ] **Step 2: Update vote detail page — ISR and fetchAfstemning**

In `src/app/vote/[id]/page.tsx`:

1. Replace the import on line 4:

Old:
```typescript
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"
```

New:
```typescript
import { fetchAfstemning, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"
```

2. Replace line 14:

Old:
```typescript
export const dynamic = "force-dynamic"
```

New:
```typescript
export const revalidate = 10800
```

3. Replace lines 21-26 (the direct `fetchFromOda` call):

Old:
```typescript
  let afstemning: OdaAfstemning
  try {
    afstemning = await fetchFromOda<OdaAfstemning>(`/Afstemning(${voteId})`)
  } catch {
    notFound()
  }
```

New:
```typescript
  let afstemning: OdaAfstemning
  try {
    afstemning = await fetchAfstemning(voteId)
  } catch {
    notFound()
  }
```

4. Remove the `OdaAfstemning` type import on line 12 if it becomes unused. Check — it's used in the `let afstemning: OdaAfstemning` declaration, so keep it.

- [ ] **Step 3: Update party page**

In `src/app/party/[abbreviation]/page.tsx`, replace line 8:

Old:
```typescript
export const dynamic = "force-dynamic"
```

New:
```typescript
export const revalidate = 10800
```

- [ ] **Step 4: Verify build passes**

Run: `npx next build`
Expected: Build succeeds. Dashboard, vote detail, and party pages should show as ISR in build output (not `λ` dynamic).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/vote/[id]/page.tsx src/app/party/[abbreviation]/page.tsx
git commit -m "perf: switch dashboard, vote detail, and party pages to ISR (3h revalidation)"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds with ISR pages shown in output

- [ ] **Step 3: Verify locally with dev server**

Run: `npx next dev`

Check these URLs load correctly:
- `http://localhost:3000` (dashboard)
- `http://localhost:3000/vote/{any-id}` (vote detail)
- `http://localhost:3000/party/s` (party page)
- `http://localhost:3000/compare` (compare — still dynamic)

- [ ] **Step 4: Commit if any cleanup needed**

Only if there are changes:
```bash
git add src/lib/oda/client.ts src/lib/config.ts
git commit -m "chore: performance optimization cleanup"
```
