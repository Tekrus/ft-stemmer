# FT Stemmer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js app that displays Danish Parliament voting results with party-colored visualizations and AI summaries, deployed on Vercel.

**Architecture:** Next.js App Router with RSC + ISR. ODA API data is fetched server-side through a cache-aware service layer backed by Vercel KV (Redis). AI summaries generated via Vercel AI SDK + Gateway. Client interactivity (search, pagination) via Server Actions.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Vercel KV, Vercel AI SDK, `@ai-sdk/gateway`

**Spec:** `docs/superpowers/specs/2026-03-19-ft-stemmer-design.md`

---

## File Map

```
ft-stemmer/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Task 3: Root layout
│   │   ├── page.tsx                # Task 8: Dashboard
│   │   ├── loading.tsx             # Task 8: Dashboard skeleton
│   │   ├── error.tsx               # Task 8: Error boundary
│   │   ├── not-found.tsx           # Task 8: Global 404
│   │   ├── vote/[id]/
│   │   │   ├── page.tsx            # Task 9: Vote detail
│   │   │   ├── loading.tsx         # Task 9: Vote detail skeleton
│   │   │   ├── error.tsx           # Task 9: Error boundary
│   │   │   └── not-found.tsx       # Task 9: Vote 404
│   │   └── search/
│   │       ├── page.tsx            # Task 10: Search page
│   │       └── error.tsx           # Task 10: Error boundary
│   ├── components/
│   │   ├── ui/                     # Task 3: shadcn/ui primitives
│   │   ├── vote-card.tsx           # Task 7: Compact vote card
│   │   ├── vote-bar.tsx            # Task 7: Segmented progress bar
│   │   ├── vote-status-badge.tsx   # Task 7: Vedtaget/Forkastet badge
│   │   ├── party-badge.tsx         # Task 7: Colored party circle
│   │   ├── party-table.tsx         # Task 7: Party breakdown table
│   │   ├── party-vote-groups.tsx   # Task 7: For/imod party groups
│   │   ├── search-bar.tsx          # Task 10: Search input
│   │   └── load-more-button.tsx    # Task 8: Pagination button
│   ├── lib/
│   │   ├── oda/
│   │   │   ├── client.ts           # Task 5: ODA API fetcher
│   │   │   ├── types.ts            # Task 4: ODA response types
│   │   │   ├── mapper.ts           # Task 5: ODA → VoteSummary
│   │   │   ├── constants.ts        # Task 4: Stemmetype/Afstemningstype maps
│   │   │   ├── validate.ts         # Task 5: Startup ID validation
│   │   │   └── fetch-votes.ts      # Task 8: Vote summary orchestration
│   │   ├── ai/
│   │   │   └── summarizer.ts       # Task 6: AI summary + KV cache
│   │   ├── kv/
│   │   │   └── client.ts           # Task 4: KV wrapper
│   │   ├── actions/
│   │   │   ├── search.ts           # Task 10: Server Action
│   │   │   └── load-more.ts        # Task 8: Server Action
│   │   ├── config.ts               # Task 2: Configuration
│   │   └── parties.ts              # Task 4: Party colors/names
│   └── types/
│       └── vote.ts                 # Task 4: Domain types
├── __tests__/
│   ├── lib/
│   │   ├── oda/
│   │   │   ├── client.test.ts      # Task 5: ODA client tests
│   │   │   ├── mapper.test.ts      # Task 5: Mapper tests
│   │   │   └── fetch-votes.test.ts # Task 8: Orchestration tests
│   │   ├── ai/
│   │   │   └── summarizer.test.ts  # Task 6: AI summarizer tests
│   │   ├── kv/
│   │   │   └── client.test.ts      # Task 4: KV wrapper tests
│   │   └── parties.test.ts         # Task 4: Party mapping tests
│   └── components/
│       ├── vote-card.test.tsx       # Task 7: Component tests
│       ├── vote-bar.test.tsx        # Task 7: Component tests
│       ├── party-badge.test.tsx     # Task 7: Component tests
│       └── party-table.test.tsx     # Task 7: Component tests
├── public/
├── vercel.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts                # Task 2: Test config
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`, `.env.local.example`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/wexodma/sites/ft-stemmer
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Accept defaults. This creates the Next.js project with App Router, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Install dependencies**

```bash
npm install @vercel/kv ai @ai-sdk/gateway
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `.env.local.example`**

```bash
# .env.local.example
KV_REST_API_URL=
KV_REST_API_TOKEN=
AI_MODEL=google/gemini-2.5-flash-lite
REVALIDATE_DASHBOARD=1800
REVALIDATE_VOTE_DETAIL=3600
ODA_CACHE_TTL=1800
ODA_CACHE_TTL_HISTORICAL=86400
ODA_REQUEST_DELAY_MS=100
DEFAULT_PAGE_SIZE=15
```

- [ ] **Step 4: Create `.gitignore` additions**

Append to the generated `.gitignore`:
```
.env.local
```

- [ ] **Step 5: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Configuration & Test Setup

**Files:**
- Create: `src/lib/config.ts`, `vitest.config.ts`

- [ ] **Step 1: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
```

- [ ] **Step 2: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create config module**

Create `src/lib/config.ts`:
```typescript
export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 100),
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
    model: process.env.AI_MODEL ?? "google/gemini-2.5-flash-lite",
  },
}
```

- [ ] **Step 4: Verify test runner works**

```bash
npm test
```

Expected: 0 tests, no errors.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/lib/config.ts package.json
git commit -m "chore: add vitest config and app configuration module"
```

---

## Task 3: Next.js Shell & shadcn/ui Setup

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/ui/` (via shadcn CLI)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: New York style, Zinc base color, CSS variables.

- [ ] **Step 2: Add required shadcn components**

```bash
npx shadcn@latest add badge card table input skeleton
```

- [ ] **Step 3: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FT Stemmer — Folketingets Afstemninger",
  description: "Overskueligt overblik over afstemninger i Folketinget",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify app starts**

```bash
npm run dev
```

Visit `http://localhost:3000` — should show the default page with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: setup shadcn/ui and root layout"
```

---

## Task 4: Domain Types, Party Mapping & KV Client

**Files:**
- Create: `src/types/vote.ts`, `src/lib/parties.ts`, `src/lib/oda/types.ts`, `src/lib/kv/client.ts`
- Create: `__tests__/lib/parties.test.ts`, `__tests__/lib/kv/client.test.ts`

- [ ] **Step 1: Write party mapping test**

Create `__tests__/lib/parties.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { getPartyInfo, PARTY_MAP } from "@/lib/parties"

describe("getPartyInfo", () => {
  it("returns correct info for known party", () => {
    const info = getPartyInfo("S")
    expect(info).toEqual({
      abbreviation: "S",
      name: "Socialdemokratiet",
      color: "#a82721",
    })
  })

  it("returns fallback for unknown party", () => {
    const info = getPartyInfo("XYZ")
    expect(info).toEqual({
      abbreviation: "XYZ",
      name: "XYZ",
      color: "#6b7280",
    })
  })

  it("returns UFG for empty string", () => {
    const info = getPartyInfo("")
    expect(info).toEqual({
      abbreviation: "UFG",
      name: "Uden for Folketingsgrupperne",
      color: "#6b7280",
    })
  })

  it("has all major Danish parties", () => {
    const expected = ["S", "V", "SF", "EL", "M", "DD", "LA", "KF", "DF", "RV", "ALT"]
    for (const abbr of expected) {
      expect(PARTY_MAP[abbr]).toBeDefined()
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- __tests__/lib/parties.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ODA constants (single source of truth for ID maps)**

Create `src/lib/oda/constants.ts`:
```typescript
export const STEMMETYPE = { FOR: 1, IMOD: 2, FRAVAER: 3, HVERKEN: 4 } as const

export const AFSTEMNINGSTYPE_MAP: Readonly<Record<number, string>> = {
  1: "Endelig vedtagelse",
  2: "Udvalgsindstilling",
  3: "Forslag til vedtagelse",
  4: "Ændringsforslag",
}
```

- [ ] **Step 4: Create domain types**

Create `src/types/vote.ts`:
```typescript
export type VoteSummary = {
  readonly id: number
  readonly number: string
  readonly title: string
  readonly shortTitle: string
  readonly resume: string
  readonly date: string
  readonly passed: boolean
  readonly conclusion: string
  readonly type: string
  readonly lawNumber: string | null
  readonly lawDate: string | null
  readonly partyVotes: readonly PartyVote[]
  readonly totals: VoteTotals
}

export type PartyVote = {
  readonly party: string
  readonly partyName: string
  readonly color: string
  readonly for: number
  readonly against: number
  readonly absent: number
  readonly abstained: number
}

export type VoteTotals = {
  readonly for: number
  readonly against: number
  readonly absent: number
  readonly abstained: number
  readonly total: number
}

export type PartyInfo = {
  readonly abbreviation: string
  readonly name: string
  readonly color: string
}
```

- [ ] **Step 5: Create ODA API types**

Create `src/lib/oda/types.ts`:
```typescript
export type OdaAfstemning = {
  readonly id: number
  readonly nummer: number
  readonly konklusion: string
  readonly vedtaget: boolean
  readonly kommentar: string | null
  readonly mødeid: number
  readonly typeid: number
  readonly sagstrinid: number | null
  readonly opdateringsdato: string
}

export type OdaSagstrin = {
  readonly id: number
  readonly titel: string
  readonly dato: string
  readonly sagid: number
  readonly typeid: number
  readonly statusid: number
  readonly opdateringsdato: string
}

export type OdaSag = {
  readonly id: number
  readonly typeid: number
  readonly titel: string
  readonly titelkort: string
  readonly resume: string | null
  readonly nummer: string
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly afstemningskonklusion: string | null
  readonly opdateringsdato: string
}

export type OdaStemme = {
  readonly id: number
  readonly typeid: number
  readonly afstemningid: number
  readonly aktørid: number
  readonly opdateringsdato: string
  readonly Aktør?: OdaAktør
}

export type OdaAktør = {
  readonly id: number
  readonly typeid: number
  readonly navn: string
  readonly fornavn: string | null
  readonly efternavn: string | null
  readonly biografi: string | null
  readonly opdateringsdato: string
}

export type OdaResponse<T> = {
  readonly "odata.metadata": string
  readonly value: readonly T[]
}

export type OdaStemmetype = {
  readonly id: number
  readonly type: string
  readonly opdateringsdato: string
}

export type OdaAfstemningstype = {
  readonly id: number
  readonly type: string
  readonly opdateringsdato: string
}
```

- [ ] **Step 6: Create party mapping**

Create `src/lib/parties.ts`:
```typescript
import type { PartyInfo } from "@/types/vote"

export const PARTY_MAP: Readonly<Record<string, { name: string; color: string }>> = {
  S:   { name: "Socialdemokratiet", color: "#a82721" },
  V:   { name: "Venstre", color: "#254264" },
  SF:  { name: "SF", color: "#e4007e" },
  EL:  { name: "Enhedslisten", color: "#e4002b" },
  M:   { name: "Moderaterne", color: "#5b2d6e" },
  DD:  { name: "Danmarksdemokraterne", color: "#00505c" },
  LA:  { name: "Liberal Alliance", color: "#13576b" },
  KF:  { name: "Det Konservative Folkeparti", color: "#00583c" },
  DF:  { name: "Dansk Folkeparti", color: "#e4ae00" },
  RV:  { name: "Radikale Venstre", color: "#733280" },
  ALT: { name: "Alternativet", color: "#2b8738" },
}

const FALLBACK_COLOR = "#6b7280"

export function getPartyInfo(abbreviation: string): PartyInfo {
  if (!abbreviation) {
    return { abbreviation: "UFG", name: "Uden for Folketingsgrupperne", color: FALLBACK_COLOR }
  }
  const entry = PARTY_MAP[abbreviation]
  if (entry) {
    return { abbreviation, name: entry.name, color: entry.color }
  }
  return { abbreviation, name: abbreviation, color: FALLBACK_COLOR }
}
```

- [ ] **Step 7: Run party test — expect PASS**

```bash
npm test -- __tests__/lib/parties.test.ts
```

Expected: PASS.

- [ ] **Step 8: Write KV client test**

Create `__tests__/lib/kv/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @vercel/kv before importing
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { kvGet, kvSet } from "@/lib/kv/client"
import { kv } from "@vercel/kv"

describe("kvGet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns parsed JSON on cache hit", async () => {
    vi.mocked(kv.get).mockResolvedValue({ id: 1, name: "test" })
    const result = await kvGet("oda:test:1")
    expect(result).toEqual({ id: 1, name: "test" })
    expect(kv.get).toHaveBeenCalledWith("oda:test:1")
  })

  it("returns null on cache miss", async () => {
    vi.mocked(kv.get).mockResolvedValue(null)
    const result = await kvGet("oda:test:999")
    expect(result).toBeNull()
  })

  it("returns null and logs on KV error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(kv.get).mockRejectedValue(new Error("KV unavailable"))
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
    vi.mocked(kv.set).mockResolvedValue("OK")
    await kvSet("oda:test:1", { id: 1 }, 1800)
    expect(kv.set).toHaveBeenCalledWith("oda:test:1", { id: 1 }, { ex: 1800 })
  })

  it("sets value without TTL when 0", async () => {
    vi.mocked(kv.set).mockResolvedValue("OK")
    await kvSet("oda:test:1", { id: 1 }, 0)
    expect(kv.set).toHaveBeenCalledWith("oda:test:1", { id: 1 }, {})
  })

  it("does not throw on KV error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(kv.set).mockRejectedValue(new Error("KV unavailable"))
    await expect(kvSet("key", "val", 100)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 9: Run KV test — expect FAIL**

```bash
npm test -- __tests__/lib/kv/client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 10: Create KV client**

Create `src/lib/kv/client.ts`:
```typescript
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
```

- [ ] **Step 11: Run KV test — expect PASS**

```bash
npm test -- __tests__/lib/kv/client.test.ts
```

Expected: PASS.

- [ ] **Step 12: Run all tests**

```bash
npm test
```

Expected: All PASS.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add domain types, party mapping, ODA constants, and KV cache client"
```

---

## Task 5: ODA API Client & Mapper

**Files:**
- Create: `src/lib/oda/client.ts`, `src/lib/oda/mapper.ts`
- Create: `__tests__/lib/oda/client.test.ts`, `__tests__/lib/oda/mapper.test.ts`

- [ ] **Step 1: Write mapper test for biografi XML parsing**

Create `__tests__/lib/oda/mapper.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { extractPartyFromBiografi, mapStemmeToPartyVotes } from "@/lib/oda/mapper"
import type { OdaStemme } from "@/lib/oda/types"

describe("extractPartyFromBiografi", () => {
  it("extracts party and shortname from XML", () => {
    const bio = `<Biography><party>Socialdemokratiet</party><partyShortname>S</partyShortname></Biography>`
    const result = extractPartyFromBiografi(bio)
    expect(result).toEqual({ party: "Socialdemokratiet", partyShortname: "S" })
  })

  it("returns null for null biografi", () => {
    expect(extractPartyFromBiografi(null)).toBeNull()
  })

  it("returns null for biografi without party tags", () => {
    const bio = `<Biography><name>Test</name></Biography>`
    expect(extractPartyFromBiografi(bio)).toBeNull()
  })

  it("handles multiline biografi", () => {
    const bio = `<Biography>
      <name>Mette Frederiksen</name>
      <party>Socialdemokratiet</party>
      <partyShortname>S</partyShortname>
      <born>1977</born>
    </Biography>`
    const result = extractPartyFromBiografi(bio)
    expect(result).toEqual({ party: "Socialdemokratiet", partyShortname: "S" })
  })
})

describe("mapStemmeToPartyVotes", () => {
  const makeStemme = (typeid: number, partyShort: string, partyName: string): OdaStemme => ({
    id: 1,
    typeid,
    afstemningid: 100,
    aktørid: 1,
    opdateringsdato: "2026-01-01",
    Aktør: {
      id: 1,
      typeid: 5,
      navn: "Test",
      fornavn: "Test",
      efternavn: "Person",
      biografi: `<Biography><party>${partyName}</party><partyShortname>${partyShort}</partyShortname></Biography>`,
      opdateringsdato: "2026-01-01",
    },
  })

  it("groups votes by party and counts correctly", () => {
    const stemmer: OdaStemme[] = [
      makeStemme(1, "S", "Socialdemokratiet"),
      makeStemme(1, "S", "Socialdemokratiet"),
      makeStemme(2, "S", "Socialdemokratiet"),
      makeStemme(1, "V", "Venstre"),
      makeStemme(2, "V", "Venstre"),
    ]
    const { partyVotes, totals } = mapStemmeToPartyVotes(stemmer)

    const sVotes = partyVotes.find((p) => p.party === "S")
    expect(sVotes).toBeDefined()
    expect(sVotes!.for).toBe(2)
    expect(sVotes!.against).toBe(1)

    const vVotes = partyVotes.find((p) => p.party === "V")
    expect(vVotes).toBeDefined()
    expect(vVotes!.for).toBe(1)
    expect(vVotes!.against).toBe(1)

    expect(totals.for).toBe(3)
    expect(totals.against).toBe(2)
    expect(totals.total).toBe(5)
  })

  it("handles missing biografi with UFG fallback", () => {
    const stemmer: OdaStemme[] = [
      {
        id: 1, typeid: 1, afstemningid: 100, aktørid: 1, opdateringsdato: "2026-01-01",
        Aktør: { id: 1, typeid: 5, navn: "Unknown", fornavn: null, efternavn: null, biografi: null, opdateringsdato: "2026-01-01" },
      },
    ]
    const { partyVotes } = mapStemmeToPartyVotes(stemmer)
    expect(partyVotes[0].party).toBe("UFG")
  })
})
```

- [ ] **Step 2: Run mapper test — expect FAIL**

```bash
npm test -- __tests__/lib/oda/mapper.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement mapper**

Create `src/lib/oda/mapper.ts`:
```typescript
import type { OdaStemme, OdaAfstemning, OdaSag, OdaSagstrin } from "./types"
import { STEMMETYPE } from "./constants"
import type { PartyVote, VoteSummary, VoteTotals } from "@/types/vote"
import { getPartyInfo } from "@/lib/parties"

export function extractPartyFromBiografi(
  biografi: string | null
): { party: string; partyShortname: string } | null {
  if (!biografi) return null
  const partyMatch = biografi.match(/<party>([^<]+)<\/party>/)
  const shortMatch = biografi.match(/<partyShortname>([^<]+)<\/partyShortname>/)
  if (!partyMatch || !shortMatch) return null
  return { party: partyMatch[1], partyShortname: shortMatch[1] }
}

export function mapStemmeToPartyVotes(
  stemmer: readonly OdaStemme[]
): { partyVotes: PartyVote[]; totals: VoteTotals } {
  const grouped = new Map<string, { partyName: string; for: number; against: number; absent: number; abstained: number }>()

  for (const stemme of stemmer) {
    const extracted = extractPartyFromBiografi(stemme.Aktør?.biografi ?? null)
    const abbr = extracted?.partyShortname ?? ""
    const partyInfo = getPartyInfo(abbr)
    const key = partyInfo.abbreviation

    if (!grouped.has(key)) {
      grouped.set(key, { partyName: partyInfo.name, for: 0, against: 0, absent: 0, abstained: 0 })
    }
    const counts = grouped.get(key)!
    switch (stemme.typeid) {
      case STEMMETYPE.FOR: counts.for++; break
      case STEMMETYPE.IMOD: counts.against++; break
      case STEMMETYPE.FRAVAER: counts.absent++; break
      case STEMMETYPE.HVERKEN: counts.abstained++; break
    }
  }

  const partyVotes: PartyVote[] = Array.from(grouped.entries()).map(([abbr, counts]) => ({
    party: abbr,
    partyName: counts.partyName,
    color: getPartyInfo(abbr).color,
    for: counts.for,
    against: counts.against,
    absent: counts.absent,
    abstained: counts.abstained,
  }))

  const totals: VoteTotals = {
    for: partyVotes.reduce((sum, p) => sum + p.for, 0),
    against: partyVotes.reduce((sum, p) => sum + p.against, 0),
    absent: partyVotes.reduce((sum, p) => sum + p.absent, 0),
    abstained: partyVotes.reduce((sum, p) => sum + p.abstained, 0),
    total: stemmer.length,
  }

  return { partyVotes, totals }
}

export function mapToVoteSummary(
  afstemning: OdaAfstemning,
  sagstrin: OdaSagstrin | null,
  sag: OdaSag | null,
  stemmer: readonly OdaStemme[],
  afstemningstype: string,
): VoteSummary {
  const { partyVotes, totals } = mapStemmeToPartyVotes(stemmer)
  return {
    id: afstemning.id,
    number: sag?.nummer ?? "",
    title: sag?.titel ?? "",
    shortTitle: sag?.titelkort ?? "",
    resume: sag?.resume ?? sag?.titel ?? "",
    date: sagstrin?.dato ?? afstemning.opdateringsdato,
    passed: afstemning.vedtaget,
    conclusion: afstemning.konklusion,
    type: afstemningstype,
    lawNumber: sag?.lovnummer ?? null,
    lawDate: sag?.lovnummerdato ?? null,
    partyVotes,
    totals,
  }
}
```

- [ ] **Step 4: Run mapper test — expect PASS**

```bash
npm test -- __tests__/lib/oda/mapper.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write ODA client test**

Create `__tests__/lib/oda/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/kv/client", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { fetchFromOda } from "@/lib/oda/client"
import { kvGet, kvSet } from "@/lib/kv/client"

describe("fetchFromOda", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns cached data on KV hit", async () => {
    const cached = { value: [{ id: 1 }] }
    vi.mocked(kvGet).mockResolvedValue(cached)

    const result = await fetchFromOda("/Afstemning?$top=1")
    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("fetches from ODA on cache miss and caches result", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    const odaResponse = { value: [{ id: 1 }] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(odaResponse),
    })

    const result = await fetchFromOda("/Afstemning?$top=1")
    expect(result).toEqual(odaResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(kvSet).toHaveBeenCalled()
  })

  it("retries on 503 with backoff", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ value: [] }) })

    const result = await fetchFromOda("/Afstemning?$top=1")
    expect(result).toEqual({ value: [] })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("throws after max retries", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    mockFetch.mockResolvedValue({ ok: false, status: 503 })

    await expect(fetchFromOda("/Afstemning?$top=1")).rejects.toThrow()
  })
})
```

- [ ] **Step 6: Run ODA client test — expect FAIL**

```bash
npm test -- __tests__/lib/oda/client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement ODA client**

Create `src/lib/oda/client.ts`:
```typescript
import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"
import { createHash } from "crypto"

const MAX_RETRIES = 3
const RETRY_STATUS_CODES = [429, 503]

function cacheKey(path: string): string {
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 16)
  return `oda:query:${hash}`
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
      const data = await response.json() as T
      await kvSet(key, data, ttl ?? config.cache.odaTtl)
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

export async function fetchSagstrin(id: number) {
  return fetchFromOda<import("./types").OdaSagstrin>(
    `/Sagstrin(${id})`,
    config.cache.odaTtlHistorical
  )
}

export async function fetchSag(id: number) {
  return fetchFromOda<import("./types").OdaSag>(
    `/Sag(${id})`,
    config.cache.odaTtlHistorical
  )
}

export async function fetchStemmer(afstemningId: number) {
  return fetchFromOda<{ value: import("./types").OdaStemme[] }>(
    `/Stemme?$filter=afstemningid eq ${afstemningId}&$expand=Akt%C3%B8r`
  )
}
```

- [ ] **Step 9: Create startup validation for Stemmetype/Afstemningstype IDs**

Create `src/lib/oda/validate.ts`:
```typescript
import { fetchFromOda } from "./client"
import { STEMMETYPE, AFSTEMNINGSTYPE_MAP } from "./constants"
import type { OdaStemmetype, OdaAfstemningstype, OdaResponse } from "./types"

const EXPECTED_STEMMETYPE: Record<number, string> = {
  [STEMMETYPE.FOR]: "For",
  [STEMMETYPE.IMOD]: "Imod",
  [STEMMETYPE.FRAVAER]: "Fravær",
  [STEMMETYPE.HVERKEN]: "Hverken for eller imod",
}

export async function validateOdaMappings(): Promise<void> {
  try {
    const stemmetyper = await fetchFromOda<OdaResponse<OdaStemmetype>>("/Stemmetype")
    for (const st of stemmetyper.value) {
      const expected = EXPECTED_STEMMETYPE[st.id]
      if (expected && st.type !== expected) {
        console.warn(`[ODA] Stemmetype ID ${st.id} changed: expected "${expected}", got "${st.type}"`)
      }
    }

    const afstemningstyper = await fetchFromOda<OdaResponse<OdaAfstemningstype>>("/Afstemningstype")
    for (const at of afstemningstyper.value) {
      const expected = AFSTEMNINGSTYPE_MAP[at.id]
      if (expected && at.type !== expected) {
        console.warn(`[ODA] Afstemningstype ID ${at.id} changed: expected "${expected}", got "${at.type}"`)
      }
    }

    console.log("[ODA] Mapping validation complete")
  } catch (error) {
    console.warn("[ODA] Could not validate mappings:", error)
  }
}
```

This is called once at application startup (e.g., in `instrumentation.ts` or lazily on first request).
```

- [ ] **Step 8: Run ODA client test — expect PASS**

```bash
npm test -- __tests__/lib/oda/client.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: All PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add ODA API client with KV caching and vote mapper"
```

---

## Task 6: AI Summarizer

**Files:**
- Create: `src/lib/ai/summarizer.ts`
- Create: `__tests__/lib/ai/summarizer.test.ts`

- [ ] **Step 1: Write summarizer test**

Create `__tests__/lib/ai/summarizer.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/kv/client", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}))

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@ai-sdk/gateway", () => ({
  gateway: vi.fn(() => "mock-model"),
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
  })

  it("returns cached summary when hash matches", async () => {
    vi.mocked(kvGet).mockResolvedValue({
      summary: "Cached summary",
      model: "test-model",
      resumeHash: "a7ab0ef8ae4e3ba693bdd901ace47a4108ecc3f7a6a103ec1dad02ed",
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

  it("returns null on AI failure", async () => {
    vi.mocked(kvGet).mockResolvedValue(null)
    vi.mocked(generateText).mockRejectedValue(new Error("AI unavailable"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await getOrGenerateSummary(input)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- __tests__/lib/ai/summarizer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement summarizer**

Create `src/lib/ai/summarizer.ts`:
```typescript
import { generateText } from "ai"
import { gateway } from "@ai-sdk/gateway"
import { createHash } from "crypto"
import { config } from "@/lib/config"
import { kvGet, kvSet } from "@/lib/kv/client"
import type { VoteTotals } from "@/types/vote"

type SummaryInput = {
  readonly sagId: number
  readonly titel: string
  readonly resume: string
  readonly nummer: string
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly vedtaget: boolean
  readonly totals: VoteTotals
}

type CachedSummary = {
  readonly summary: string
  readonly model: string
  readonly resumeHash: string
  readonly createdAt: string
}

function hashResume(resume: string): string {
  return createHash("sha256").update(resume).digest("hex").slice(0, 56)
}

function buildPrompt(input: SummaryInput): string {
  const lawRef = input.lovnummer
    ? `Lov nr. ${input.lovnummer} af ${input.lovnummerdato}.`
    : ""
  const outcome = input.vedtaget
    ? `Forslaget blev vedtaget med ${input.totals.for} stemmer for og ${input.totals.against} imod.`
    : `Forslaget blev forkastet med ${input.totals.for} stemmer for og ${input.totals.against} imod.`

  return `Lovforslag: ${input.nummer} — ${input.titel}

Resume: ${input.resume}

${lawRef}

${outcome}

Samlet: ${input.totals.for} for, ${input.totals.against} imod, ${input.totals.absent} fravær, ${input.totals.abstained} hverken for eller imod.`
}

export async function getOrGenerateSummary(input: SummaryInput): Promise<string | null> {
  const kvKey = `summary:${input.sagId}`
  const currentHash = hashResume(input.resume)

  const cached = await kvGet<CachedSummary>(kvKey)
  if (cached && cached.resumeHash === currentHash) {
    return cached.summary
  }

  try {
    const { text } = await generateText({
      model: gateway(config.ai.model),
      system: "Opsummer dette lovforslag i 2-3 sætninger på dansk i et letforståeligt sprog. Forklar hvad det betyder for borgerne. Nævn om forslaget blev vedtaget eller forkastet og med hvilken margin.",
      prompt: buildPrompt(input),
    })

    await kvSet<CachedSummary>(kvKey, {
      summary: text,
      model: config.ai.model,
      resumeHash: currentHash,
      createdAt: new Date().toISOString(),
    }, 0)

    return text
  } catch (error) {
    console.error("[AI] Summary generation failed:", error)
    return null
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- __tests__/lib/ai/summarizer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add AI summarizer with Vercel AI SDK and KV caching"
```

---

## Task 7: UI Components

**Files:**
- Create: `src/components/vote-status-badge.tsx`, `src/components/party-badge.tsx`, `src/components/vote-bar.tsx`, `src/components/party-vote-groups.tsx`, `src/components/party-table.tsx`, `src/components/vote-card.tsx`
- Create: `__tests__/components/party-badge.test.tsx`, `__tests__/components/vote-bar.test.tsx`

- [ ] **Step 1: Write PartyBadge test**

Create `__tests__/components/party-badge.test.tsx`:
```tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PartyBadge } from "@/components/party-badge"

describe("PartyBadge", () => {
  it("renders abbreviation and count", () => {
    render(<PartyBadge abbreviation="S" color="#a82721" count={48} />)
    expect(screen.getByText("S")).toBeDefined()
    expect(screen.getByText("48")).toBeDefined()
  })

  it("applies party color to dot", () => {
    const { container } = render(<PartyBadge abbreviation="V" color="#254264" count={15} />)
    const dot = container.querySelector("[data-party-dot]")
    expect(dot).toBeDefined()
    expect(dot?.getAttribute("style")).toContain("#254264")
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- __tests__/components/party-badge.test.tsx
```

- [ ] **Step 3: Create VoteStatusBadge**

Create `src/components/vote-status-badge.tsx`:
```tsx
import { Badge } from "@/components/ui/badge"

type Props = {
  readonly passed: boolean
}

export function VoteStatusBadge({ passed }: Props) {
  return (
    <Badge variant={passed ? "default" : "destructive"} className={passed ? "bg-green-600 hover:bg-green-700" : ""}>
      {passed ? "Vedtaget" : "Forkastet"}
    </Badge>
  )
}
```

- [ ] **Step 4: Create PartyBadge**

Create `src/components/party-badge.tsx`:
```tsx
type Props = {
  readonly abbreviation: string
  readonly color: string
  readonly count?: number
}

export function PartyBadge({ abbreviation, color, count }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span
        data-party-dot
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-medium">{abbreviation}</span>
      {count !== undefined && <span className="text-muted-foreground">{count}</span>}
    </span>
  )
}
```

- [ ] **Step 5: Run PartyBadge test — expect PASS**

```bash
npm test -- __tests__/components/party-badge.test.tsx
```

- [ ] **Step 6: Create VoteBar**

Create `src/components/vote-bar.tsx`:
```tsx
import type { PartyVote } from "@/types/vote"

type Props = {
  readonly partyVotes: readonly PartyVote[]
  readonly totalFor: number
  readonly totalAgainst: number
}

export function VoteBar({ partyVotes, totalFor, totalAgainst }: Props) {
  const total = totalFor + totalAgainst
  if (total === 0) return null

  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="w-full">
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {forParties.map((p) => (
          <div
            key={`for-${p.party}`}
            className="h-full transition-all"
            style={{
              width: `${(p.for / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.party}: ${p.for} for`}
          />
        ))}
        {againstParties.map((p) => (
          <div
            key={`against-${p.party}`}
            className="h-full opacity-60 transition-all"
            style={{
              width: `${(p.against / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.party}: ${p.against} imod`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-sm text-muted-foreground">
        <span>For: {totalFor}</span>
        <span>Imod: {totalAgainst}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create PartyVoteGroups**

Create `src/components/party-vote-groups.tsx`:
```tsx
import type { PartyVote } from "@/types/vote"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyVoteGroups({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)

  return (
    <div className="space-y-1">
      {forParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-green-700 dark:text-green-400 w-10">FOR:</span>
          {forParties.map((p) => (
            <PartyBadge key={p.party} abbreviation={p.party} color={p.color} count={p.for} />
          ))}
        </div>
      )}
      {againstParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400 w-10">IMOD:</span>
          {againstParties.map((p) => (
            <PartyBadge key={p.party} abbreviation={p.party} color={p.color} count={p.against} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Create PartyTable**

Create `src/components/party-table.tsx`:
```tsx
import type { PartyVote } from "@/types/vote"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PartyBadge } from "./party-badge"

type Props = {
  readonly partyVotes: readonly PartyVote[]
}

export function PartyTable({ partyVotes }: Props) {
  const forParties = partyVotes.filter((p) => p.for > 0).sort((a, b) => b.for - a.for)
  const againstParties = partyVotes.filter((p) => p.against > 0).sort((a, b) => b.against - a.against)
  const sorted = [...forParties, ...againstParties.filter((p) => !forParties.includes(p))]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Parti</TableHead>
          <TableHead className="text-right">For</TableHead>
          <TableHead className="text-right">Imod</TableHead>
          <TableHead className="text-right">Fravær</TableHead>
          <TableHead className="text-right">Hv. for/imod</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => {
          const isFor = p.for > p.against
          const bgClass = isFor ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
          return (
            <TableRow key={p.party} className={bgClass}>
              <TableCell>
                <PartyBadge abbreviation={p.party} color={p.color} />
                <span className="ml-2 text-sm text-muted-foreground">{p.partyName}</span>
              </TableCell>
              <TableCell className="text-right font-medium">{p.for || "—"}</TableCell>
              <TableCell className="text-right font-medium">{p.against || "—"}</TableCell>
              <TableCell className="text-right">{p.absent || "—"}</TableCell>
              <TableCell className="text-right">{p.abstained || "—"}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 9: Create VoteCard**

Create `src/components/vote-card.tsx`:
```tsx
import Link from "next/link"
import type { VoteSummary } from "@/types/vote"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VoteStatusBadge } from "./vote-status-badge"
import { PartyVoteGroups } from "./party-vote-groups"

type Props = {
  readonly vote: VoteSummary
}

export function VoteCard({ vote }: Props) {
  return (
    <Link href={`/vote/${vote.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{vote.number}</span>
              <VoteStatusBadge passed={vote.passed} />
            </div>
            <time className="text-sm text-muted-foreground">
              {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
            </time>
          </div>
          <CardTitle className="text-base leading-snug">{vote.shortTitle || vote.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <PartyVoteGroups partyVotes={vote.partyVotes} />
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 10: Run all tests**

```bash
npm test
```

Expected: All PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add vote UI components with party-colored visualizations"
```

---

## Task 8: Dashboard Page with Load More

**Files:**
- Create: `src/app/page.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Create: `src/lib/actions/load-more.ts`, `src/components/load-more-button.tsx`

- [ ] **Step 1: Create data fetching function for dashboard**

Create `src/lib/oda/fetch-votes.ts`:
```typescript
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "./client"
import { mapToVoteSummary } from "./mapper"
import { AFSTEMNINGSTYPE_MAP } from "./constants"
import type { OdaAfstemning, OdaResponse } from "./types"
import type { VoteSummary } from "@/types/vote"
import { config } from "@/lib/config"

export async function fetchVoteSummaries(top: number, skip = 0): Promise<VoteSummary[]> {
  const response = await fetchFromOda<OdaResponse<OdaAfstemning>>(
    `/Afstemning?$top=${top}&$skip=${skip}&$orderby=opdateringsdato desc`
  )

  const summaries: VoteSummary[] = []

  for (const afstemning of response.value) {
    const sagstrin = afstemning.sagstrinid
      ? await fetchSagstrin(afstemning.sagstrinid)
      : null
    const sag = sagstrin
      ? await fetchSag(sagstrin.sagid)
      : null
    const stemmerResponse = await fetchStemmer(afstemning.id)

    summaries.push(
      mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        stemmerResponse.value,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    )
  }

  return summaries
}
```

- [ ] **Step 2: Create load-more Server Action**

Create `src/lib/actions/load-more.ts`:
```typescript
"use server"

import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import type { VoteSummary } from "@/types/vote"
import { config } from "@/lib/config"

export async function loadMoreVotes(skip: number): Promise<VoteSummary[]> {
  return fetchVoteSummaries(config.pagination.defaultPageSize, skip)
}
```

- [ ] **Step 3: Create LoadMoreButton**

Create `src/components/load-more-button.tsx`:
```tsx
"use client"

import { useState, useTransition } from "react"
import { loadMoreVotes } from "@/lib/actions/load-more"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

type Props = {
  readonly initialCount: number
}

export function LoadMoreButton({ initialCount }: Props) {
  const [votes, setVotes] = useState<VoteSummary[]>([])
  const [skip, setSkip] = useState(initialCount)
  const [hasMore, setHasMore] = useState(true)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    startTransition(async () => {
      const newVotes = await loadMoreVotes(skip)
      if (newVotes.length === 0) {
        setHasMore(false)
        return
      }
      setVotes((prev) => [...prev, ...newVotes])
      setSkip((prev) => prev + newVotes.length)
    })
  }

  return (
    <>
      {votes.map((vote) => (
        <VoteCard key={vote.id} vote={vote} />
      ))}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-4 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "Henter..." : "Vis flere"}
        </button>
      )}
    </>
  )
}
```

- [ ] **Step 4: Create Dashboard page**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link"
import { fetchVoteSummaries } from "@/lib/oda/fetch-votes"
import { config } from "@/lib/config"
import { VoteCard } from "@/components/vote-card"
import { LoadMoreButton } from "@/components/load-more-button"

export const revalidate = config.revalidate.dashboard

export default async function DashboardPage() {
  const votes = await fetchVoteSummaries(config.pagination.defaultPageSize)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FT Stemmer</h1>
          <p className="mt-1 text-muted-foreground">Seneste afstemninger i Folketinget</p>
        </div>
        <Link href="/search" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
          Søg
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Seneste afstemninger</h2>
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
        <LoadMoreButton initialCount={votes.length} />
      </section>

      <section className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Dyk dybere</h2>
        <div className="flex gap-3">
          <Link href="/search" className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
            Alle lovforslag
          </Link>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Create loading skeleton**

Create `src/app/loading.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-8 h-5 w-72" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="mt-2 h-5 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create error boundary**

Create `src/app/error.tsx`:
```tsx
"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Noget gik galt</h2>
      <p className="mt-2 text-muted-foreground">
        Folketingets data er midlertidigt utilgængeligt. Prøv igen om et øjeblik.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Prøv igen
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Create 404 page**

Create `src/app/not-found.tsx`:
```tsx
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Siden blev ikke fundet</h2>
      <p className="mt-2 text-muted-foreground">Den side du leder efter findes ikke.</p>
      <Link href="/" className="mt-4 inline-block text-primary underline hover:no-underline">
        Gå til forsiden
      </Link>
    </div>
  )
}
```

- [ ] **Step 8: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds (may warn about KV env vars not set — that's OK locally).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add dashboard page with vote list and load more"
```

---

## Task 9: Vote Detail Page

**Files:**
- Create: `src/app/vote/[id]/page.tsx`, `src/app/vote/[id]/loading.tsx`, `src/app/vote/[id]/error.tsx`, `src/app/vote/[id]/not-found.tsx`

- [ ] **Step 1: Create AISummary server component (separate file for Suspense streaming)**

Create `src/components/ai-summary.tsx`:
```tsx
import { getOrGenerateSummary } from "@/lib/ai/summarizer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { VoteTotals } from "@/types/vote"

type Props = {
  readonly sagId: number
  readonly titel: string
  readonly resume: string
  readonly nummer: string
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly vedtaget: boolean
  readonly totals: VoteTotals
}

export async function AISummary(props: Props) {
  const summary = await getOrGenerateSummary(props)
  if (!summary) return null

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">AI Opsummering</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Genereret af AI – kan indeholde fejl</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create vote detail page**

Create `src/app/vote/[id]/page.tsx`:
```tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { fetchFromOda, fetchSagstrin, fetchSag, fetchStemmer } from "@/lib/oda/client"
import { mapToVoteSummary } from "@/lib/oda/mapper"
import { AISummary } from "@/components/ai-summary"
import { config } from "@/lib/config"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import { VoteStatusBadge } from "@/components/vote-status-badge"
import { VoteBar } from "@/components/vote-bar"
import { PartyTable } from "@/components/party-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { OdaAfstemning } from "@/lib/oda/types"

export const revalidate = config.revalidate.voteDetail

// Note: AISummary is a separate async server component in its own file
// so Suspense can stream it independently of the parent page

export default async function VoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const voteId = Number(id)
  if (isNaN(voteId)) notFound()

  let afstemning: OdaAfstemning
  try {
    afstemning = await fetchFromOda<OdaAfstemning>(`/Afstemning(${voteId})`)
  } catch {
    notFound()
  }

  const sagstrin = afstemning.sagstrinid
    ? await fetchSagstrin(afstemning.sagstrinid)
    : null
  const sag = sagstrin ? await fetchSag(sagstrin.sagid) : null
  const stemmerResponse = await fetchStemmer(afstemning.id)

  const vote = mapToVoteSummary(
    afstemning, sagstrin, sag, stemmerResponse.value,
    AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Tilbage
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-muted-foreground">{vote.number}</span>
          <VoteStatusBadge passed={vote.passed} />
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{vote.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(vote.date).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {vote.type}
          {vote.lawNumber && ` · Lov nr. ${vote.lawNumber}`}
        </p>
      </header>

      <div className="space-y-6">
        {sag && (
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <AISummary
              sagId={sag.id}
              titel={vote.title}
              resume={vote.resume}
              nummer={vote.number}
              lovnummer={vote.lawNumber}
              lovnummerdato={vote.lawDate}
              vedtaget={vote.passed}
              totals={vote.totals}
            />
          </Suspense>
        )}

        {vote.resume && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resume fra Folketinget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">{vote.resume}</p>
            </CardContent>
          </Card>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Resultat</h2>
          <VoteBar
            partyVotes={vote.partyVotes}
            totalFor={vote.totals.for}
            totalAgainst={vote.totals.against}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Partier</h2>
          <PartyTable partyVotes={vote.partyVotes} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Konklusion</h2>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{vote.conclusion}</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create vote detail loading skeleton**

Create `src/app/vote/[id]/loading.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function VoteDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <Skeleton className="mb-2 h-6 w-32" />
      <Skeleton className="mb-1 h-8 w-full" />
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create vote detail error boundary**

Create `src/app/vote/[id]/error.tsx`:
```tsx
"use client"

export default function VoteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Kunne ikke hente afstemning</h2>
      <p className="mt-2 text-muted-foreground">Der opstod en fejl ved hentning af afstemningsdata.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Prøv igen
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create vote not-found page**

Create `src/app/vote/[id]/not-found.tsx`:
```tsx
import Link from "next/link"

export default function VoteNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Afstemning ikke fundet</h2>
      <p className="mt-2 text-muted-foreground">
        Afstemningen du leder efter findes ikke. Den kan være fjernet eller ID&apos;et er ugyldigt.
      </p>
      <Link href="/" className="mt-4 inline-block text-primary underline hover:no-underline">
        Se seneste afstemninger
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add vote detail page with AI summary and party breakdown"
```

---

## Task 10: Search Page

**Files:**
- Create: `src/app/search/page.tsx`, `src/app/search/error.tsx`
- Create: `src/lib/actions/search.ts`, `src/components/search-bar.tsx`

- [ ] **Step 1: Create search Server Action**

Create `src/lib/actions/search.ts`:
```typescript
"use server"

import { fetchFromOda, fetchStemmer } from "@/lib/oda/client"
import { mapToVoteSummary } from "@/lib/oda/mapper"
import { AFSTEMNINGSTYPE_MAP } from "@/lib/oda/constants"
import type { OdaAfstemning, OdaResponse, OdaSag, OdaSagstrin } from "@/lib/oda/types"
import type { VoteSummary } from "@/types/vote"
import { config } from "@/lib/config"

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''")
}

export async function searchVotes(query: string, skip = 0): Promise<VoteSummary[]> {
  if (!query || query.trim().length < 2) return []

  const escaped = escapeODataString(query.trim())
  const sagResponse = await fetchFromOda<OdaResponse<OdaSag>>(
    `/Sag?$filter=contains(titel,'${escaped}') or contains(titelkort,'${escaped}')&$top=${config.pagination.defaultPageSize}&$skip=${skip}&$orderby=opdateringsdato desc`
  )

  const summaries: VoteSummary[] = []

  for (const sag of sagResponse.value) {
    const sagstrinResponse = await fetchFromOda<OdaResponse<OdaSagstrin>>(
      `/Sagstrin?$filter=sagid eq ${sag.id}&$top=1&$orderby=dato desc`
    )
    if (sagstrinResponse.value.length === 0) continue

    const sagstrin = sagstrinResponse.value[0]
    const afstemningerResponse = await fetchFromOda<OdaResponse<OdaAfstemning>>(
      `/Afstemning?$filter=sagstrinid eq ${sagstrin.id}&$top=1&$orderby=opdateringsdato desc`
    )
    if (afstemningerResponse.value.length === 0) continue

    const afstemning = afstemningerResponse.value[0]
    const stemmerResponse = await fetchStemmer(afstemning.id)

    summaries.push(
      mapToVoteSummary(
        afstemning,
        sagstrin,
        sag,
        stemmerResponse.value,
        AFSTEMNINGSTYPE_MAP[afstemning.typeid] ?? "Ukendt"
      )
    )
  }

  return summaries
}
```

- [ ] **Step 2: Create SearchBar component**

Create `src/components/search-bar.tsx`:
```tsx
"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { searchVotes } from "@/lib/actions/search"
import type { VoteSummary } from "@/types/vote"
import { VoteCard } from "./vote-card"

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<VoteSummary[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const votes = await searchVotes(value)
        setResults(votes)
        setHasSearched(true)
      })
    }, 300)
  }, [])

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Søg i lovforslag..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full"
      />

      {isPending && <p className="text-sm text-muted-foreground">Søger...</p>}

      {hasSearched && !isPending && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Ingen resultater for &ldquo;{query}&rdquo;. Prøv at justere din søgning.
        </p>
      )}

      <div className="space-y-4">
        {results.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create search page**

Create `src/app/search/page.tsx`:
```tsx
import { SearchBar } from "@/components/search-bar"

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Søg</h1>
        <p className="mt-1 text-muted-foreground">Find afstemninger om lovforslag i Folketinget</p>
      </header>

      <SearchBar />
    </div>
  )
}
```

- [ ] **Step 4: Create search error boundary**

Create `src/app/search/error.tsx`:
```tsx
"use client"

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Søgning fejlede</h2>
      <p className="mt-2 text-muted-foreground">Der opstod en fejl under søgningen.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Prøv igen
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add search page with debounced Server Action queries"
```

---

## Task 11: Integration Test & Vercel Config

**Files:**
- Create: `vercel.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Update next.config.ts for ODA API**

Modify `next.config.ts` to allow ODA API image/external domains if needed:
```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
}

export default nextConfig
```

- [ ] **Step 3: Create vercel.json (minimal)**

Create `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

- [ ] **Step 4: Verify production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Vercel deployment config and finalize build"
```

---

## Task 12: Manual Smoke Test

- [ ] **Step 1: Set up local env vars for testing**

Create `.env.local` with your Vercel KV credentials (from Vercel Dashboard → Storage → KV):
```
KV_REST_API_URL=your-url-here
KV_REST_API_TOKEN=your-token-here
```

- [ ] **Step 2: Start dev server and verify dashboard**

```bash
npm run dev
```

Visit `http://localhost:3000` — verify:
- Votes load from ODA API
- Party badges show correct colors
- VoteCard links work
- "Vis flere" loads more votes

- [ ] **Step 3: Verify vote detail page**

Click on a vote card — verify:
- AI summary generates (may take a few seconds on first load)
- Official resume shows below
- VoteBar shows party-colored segments
- PartyTable shows correct breakdown
- Back navigation works

- [ ] **Step 4: Verify search**

Visit `/search` — verify:
- Search input debounces correctly
- Results display as VoteCards
- Empty query shows no results
- Invalid query shows helpful message

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: add local env config for development"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | package.json, next.config.ts |
| 2 | Config & test setup | config.ts, vitest.config.ts |
| 3 | Next.js shell & shadcn | layout.tsx, components/ui/ |
| 4 | Types, parties, KV client | vote.ts, parties.ts, kv/client.ts |
| 5 | ODA client & mapper | oda/client.ts, oda/mapper.ts |
| 6 | AI summarizer | ai/summarizer.ts |
| 7 | UI components | vote-card, vote-bar, party-badge, party-table |
| 8 | Dashboard page | app/page.tsx, load-more |
| 9 | Vote detail page | app/vote/[id]/page.tsx |
| 10 | Search page | app/search/page.tsx, search-bar |
| 11 | Build & Vercel config | vercel.json, next.config.ts |
| 12 | Manual smoke test | — |
