# FT Stemmer — Design Specification

## Overview

FT Stemmer is a Next.js web application that provides a clear, visual overview of recent votes (afstemninger) on bills (lovforslag) in the Danish Parliament (Folketinget). It uses data from the open ODA API at `oda.ft.dk` and presents voting results with party-colored badges, segmented vote bars, and AI-generated summaries. Deployed on Vercel.

## Goals

- **Clarity**: Make parliamentary voting results easy to understand at a glance
- **Speed**: Fast page loads via ISR with configurable revalidation intervals
- **Minimal API load**: Vercel KV cache layer for both ODA data and AI summaries
- **Accessibility**: Party-colored visual indicators with text labels as fallback
- **Zero-ops**: Fully serverless on Vercel — no infrastructure to manage

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router, React Server Components) |
| Styling | Tailwind CSS + shadcn/ui |
| Cache/Storage | Vercel KV (Redis) |
| AI Summary | Vercel AI SDK + AI Gateway (configurable model) |
| Data Source | ODA API (`oda.ft.dk/api`) — OData v4 |
| Rendering | ISR (Incremental Static Regeneration) |
| Deployment | Vercel |

## Architecture

```
Browser
├── Dashboard (RSC + ISR)
├── Vote Detail (RSC + ISR)
└── Search (Client Component → Server Actions)
        │
Next.js Server Components + Server Actions
├── lib/oda/client.ts    → ODA API (with Vercel KV cache)
├── lib/ai/summarizer.ts → Vercel AI SDK (with Vercel KV cache)
└── lib/kv/client.ts     → Vercel KV wrapper
        │
        ├── Vercel KV (Redis) — cached ODA data + AI summaries
        │
ODA API (oda.ft.dk)
├── Afstemning → Sagstrin → Sag
└── Stemme (with Aktør expand)
```

Server components fetch data directly from the ODA service layer. Client components (search, pagination) use **Next.js Server Actions** to access the same service layer. The service layer checks Vercel KV before making external requests.

## Data Flow

### Fetching a vote

1. Fetch `Afstemning` (with `$orderby=opdateringsdato desc`)
2. Via `sagstrinid` → fetch `Sagstrin` → via `sagid` → fetch `Sag` (titel, resume, nummer, lovnummer)
3. Fetch `Stemme?$filter=afstemningid eq {id}&$expand=Aktør`
4. Parse `Aktør.biografi` XML to extract `<partyShortname>` and `<party>` elements
5. Group votes by extracted `partyShortname` and `Stemme.typeid`
6. Map to `VoteSummary` type

### Party extraction from Aktør

The ODA API does **not** expose `party` or `partyShortname` as top-level JSON fields on the `Aktør` entity. These are embedded in the `biografi` XML field:

```xml
<Biography>
  ...
  <party>Socialdemokratiet</party>
  <partyShortname>S</partyShortname>
  ...
</Biography>
```

The mapper (`lib/oda/mapper.ts`) must parse this XML to extract party affiliation. Implementation uses a lightweight regex or XML parser on the `biografi` string. If `biografi` is null or missing party tags, fallback to "UFG" (Uden for Folketingsgrupperne).

### ODA API entities used

| Entity | Purpose | Key fields |
|--------|---------|------------|
| `Afstemning` | Vote event | id, vedtaget, konklusion, sagstrinid, typeid |
| `Sagstrin` | Case step (links vote to bill) | id, sagid, dato, titel |
| `Sag` | Bill/case | id, titel, titelkort, resume, nummer (includes "L" prefix), lovnummer |
| `Stemme` | Individual vote | id, typeid, afstemningid, aktørid |
| `Aktør` | Person (expanded on Stemme) | id, navn, biografi (contains party XML) |
| `Afstemningstype` | Vote type | 1=Endelig vedtagelse, 2=Udvalgsindstilling, 3=Forslag til vedtagelse, 4=Ændringsforslag |
| `Stemmetype` | Vote option | 1=For, 2=Imod, 3=Fravær, 4=Hverken for eller imod |

**Note on Stemmetype/Afstemningstype IDs:** These were verified against the live endpoints (2026-03-19). At application startup, the ODA client fetches both `Stemmetype` and `Afstemningstype` to validate the mappings and logs a warning if IDs have changed.

## Data Types

```typescript
type VoteSummary = {
  id: number
  number: string          // "L 115" (from Sag.nummer, includes prefix)
  title: string           // Sag.titel
  shortTitle: string      // Sag.titelkort
  resume: string          // Sag.resume
  date: string            // Sagstrin.dato
  passed: boolean         // Afstemning.vedtaget
  conclusion: string      // Afstemning.konklusion
  type: string            // Afstemningstype name
  lawNumber: string | null // Sag.lovnummer (if enacted)
  lawDate: string | null  // Sag.lovnummerdato
  partyVotes: PartyVote[]
  totals: VoteTotals
}

type PartyVote = {
  party: string           // "S", "V", "SF"
  partyName: string       // "Socialdemokratiet"
  color: string           // Hex color
  for: number
  against: number
  absent: number
  abstained: number       // hverken for/imod
}

type VoteTotals = {
  for: number
  against: number
  absent: number
  abstained: number
  total: number
}
```

## Party Color Mapping

Static mapping with grey fallback for unknown parties:

| Party | Abbreviation | Color |
|-------|-------------|-------|
| Socialdemokratiet | S | `#a82721` |
| Venstre | V | `#254264` |
| SF | SF | `#e4007e` |
| Enhedslisten | EL | `#e4002b` |
| Moderaterne | M | `#5b2d6e` |
| Danmarksdemokraterne | DD | `#00505c` |
| Liberal Alliance | LA | `#13576b` |
| Det Konservative Folkeparti | KF | `#00583c` |
| Dansk Folkeparti | DF | `#e4ae00` |
| Radikale Venstre | RV | `#733280` |
| Alternativet | ALT | `#2b8738` |
| Unknown/UFG | * | `#6b7280` (grey) |

## Pages & UI

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | RSC + ISR | Dashboard: latest votes + overview stats |
| `/vote/[id]` | RSC + ISR | Detailed vote view |
| `/search` | Client + Server Actions | Search and filter history |

### Dashboard (`/`)

- Header with app title and search bar
- List of recent votes as `VoteCard` components
- "Vis flere" (Load more) button — triggers Server Action to fetch next page, appends to list
- "Dyk dybere" section with links to filtered views

### VoteCard (compact)

- Bill number + Vedtaget/Forkastet badge + date
- Short title (`titelkort`)
- Party badges grouped by for/imod with visual separator:
  ```
  FOR:  (S)● 48  (V)● 15  (SF)● 8
  IMOD: (DD)● 12  (LA)● 10  (KF)● 7
  ```
- Click navigates to `/vote/[id]`

### Vote Detail (`/vote/[id]`)

- Back navigation
- Bill number, title, date, vote type
- **AI Summary** (top, with disclaimer "Genereret af AI – kan indeholde fejl")
  - Shows law number if enacted: "Lov nr. 357 af 16/12/2025"
  - Includes vote outcome context in prompt for better summaries
- **Official Resume** from Folketinget below AI summary
- **VoteBar**: Horizontal segmented bar where each segment is colored with the party's color, proportional to vote count. Left side = For, right side = Imod.
- **PartyTable**: Rows grouped by for/imod with subtle background coloring (green tint for "for", red tint for "imod"). Columns: Party badge, For, Imod, Fravær, Hverken for/imod.
- Raw conclusion text from API
- **404 handling**: If vote ID does not exist, render `not-found.tsx` with helpful message

### Components

| Component | Type | Description |
|-----------|------|-------------|
| `VoteCard` | Server | Compact vote overview card |
| `VoteBar` | Server | Party-colored segmented progress bar |
| `VoteStatusBadge` | Server | Green (Vedtaget) / Red (Forkastet) badge |
| `PartyBadge` | Server | Colored circle + abbreviation + count |
| `PartyVoteGroups` | Server | For/imod grouped party badges |
| `PartyTable` | Server | Full party breakdown table |
| `SearchBar` | Client | Debounced search input (300ms) |
| `LoadMoreButton` | Client | Pagination trigger via Server Action |

## AI Summary

### Provider

**Vercel AI SDK** with **Vercel AI Gateway**. The gateway provides access to multiple LLM providers (OpenAI, Google, Mistral, Meta, etc.) through a single API key and unified SDK. Vercel includes $5 free credits per 30 days (renewing) with access to all models.

Default model: `google/gemini-2.5-flash-lite` (cheapest at $0.10/M input tokens). Configurable via environment variable to switch to any gateway model (e.g., `mistral/ministral-14b`, `openai/gpt-oss-20b`).

### Integration

```typescript
import { generateText } from "ai"
import { gateway } from "@ai-sdk/gateway"

const { text } = await generateText({
  model: gateway(config.ai.model),
  system: "...",
  prompt: "...",
})
```

The AI SDK's `generateText` function handles the gateway routing. No provider-specific SDK needed.

### Flow

1. User opens `/vote/[id]`
2. Server component checks Vercel KV for cached summary (`summary:{sagId}`)
3. Cache hit → compare stored `resumeHash` with current `Sag.resume` hash → if match, render cached; if changed, regenerate
4. Cache miss or stale → call LLM via Vercel AI SDK → store in KV (no TTL — summaries persist until resume changes) → render
5. LLM failure → render page without AI summary, show official resume only

AI summary is rendered within a Suspense boundary with a skeleton loader, so the rest of the page loads immediately even on cache miss.

### Prompt

Input: `Sag.titel`, `Sag.resume`, `Sag.nummer`, `Sag.lovnummer`, `Sag.lovnummerdato`, `Afstemning.vedtaget`, `VoteTotals`

System prompt: "Opsummer dette lovforslag i 2-3 sætninger på dansk i et letforståeligt sprog. Forklar hvad det betyder for borgerne. Nævn om forslaget blev vedtaget eller forkastet og med hvilken margin."

### Display

AI summary is shown above the official resume with a disclaimer. Both are always visible so users can compare.

## Cache (Vercel KV)

Vercel KV is a serverless Redis store. Free tier: 256 MB storage, 30,000 requests/day. All caching uses KV with Redis-native TTL for automatic expiry.

### Key schema

| Key pattern | Value | TTL |
|-------------|-------|-----|
| `oda:{entity}:{id}` | JSON string (single record) | `config.cache.odaTtl` (default: 1800s) |
| `oda:{entity}:list:{queryHash}` | JSON string (list response) | `config.cache.odaTtl` (default: 1800s) |
| `oda:historical:{entity}:{id}` | JSON string (record older than 30 days) | `config.cache.odaTtlHistorical` (default: 86400s) |
| `summary:{sagId}` | JSON: `{ summary, model, resumeHash, createdAt }` | No TTL (persists until resume hash changes) |

### Cache strategy

- **ODA data**: Check KV → if key exists (not expired by Redis TTL) → return cached. Miss → fetch from ODA → `SET` with `EX` (TTL in seconds).
- **AI summaries**: Check KV → if exists and `resumeHash` matches current → return cached. Mismatch or miss → generate via AI SDK → `SET` without TTL.
- **Historical detection**: If `Sagstrin.dato` is older than 30 days, use `oda:historical:` prefix with longer TTL. Historical parliamentary data does not change.
- **Query hash**: SHA-256 of the OData query string, used for list cache keys.

### Why Vercel KV over SQLite

| Concern | SQLite | Vercel KV |
|---------|--------|-----------|
| Serverless compatible | No (ephemeral filesystem) | Yes (managed Redis) |
| Concurrent writes | WAL mode required | Native Redis |
| TTL/Expiry | Manual `expires_at` column | Native `EX` parameter |
| Deployment | Needs persistent volume | Zero config on Vercel |
| Free tier | N/A | 256 MB, 30k req/day |

## ODA API Resilience

### Rate limiting

The ODA API has no documented rate limits but is a government service with limited capacity. The application implements:

- **Sequential requests**: Fetches within a single vote aggregation are made sequentially, not in parallel
- **Request delay**: Configurable minimum delay between ODA requests (`config.oda.requestDelayMs`, default: 100ms)
- **Retry with backoff**: On 429/503 responses, retry up to 3 times with exponential backoff (1s, 2s, 4s)
- **Cold cache protection**: On first deploy, the dashboard prefetches only 1 page of votes. Deeper pages are fetched on demand.

## Configuration

All settings configurable via Vercel Environment Variables with sensible defaults:

```typescript
export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 100),
  },
  revalidate: {
    dashboard: Number(process.env.REVALIDATE_DASHBOARD ?? 1800),      // 30 min
    voteDetail: Number(process.env.REVALIDATE_VOTE_DETAIL ?? 3600),   // 1 hour
  },
  cache: {
    odaTtl: Number(process.env.ODA_CACHE_TTL ?? 1800),               // 30 min
    odaTtlHistorical: Number(process.env.ODA_CACHE_TTL_HISTORICAL ?? 86400), // 24 hours
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 15),
  },
  ai: {
    model: process.env.AI_MODEL ?? "google/gemini-2.5-flash-lite",    // Any Vercel AI Gateway model
  },
}
```

**Required Vercel environment variables:**
- `KV_REST_API_URL` — auto-set when linking Vercel KV store
- `KV_REST_API_TOKEN` — auto-set when linking Vercel KV store

**Optional overrides:**
- `AI_MODEL` — switch LLM model (e.g., `mistral/ministral-14b`, `openai/gpt-oss-20b`)
- `REVALIDATE_DASHBOARD`, `REVALIDATE_VOTE_DETAIL` — ISR intervals
- `ODA_CACHE_TTL`, `ODA_CACHE_TTL_HISTORICAL` — KV cache TTLs
- `ODA_REQUEST_DELAY_MS` — throttle ODA requests
- `DEFAULT_PAGE_SIZE` — votes per page

## File Structure

```
ft-stemmer/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard
│   │   ├── loading.tsx             # Dashboard skeleton
│   │   ├── error.tsx               # Error boundary
│   │   ├── not-found.tsx           # Global 404
│   │   ├── vote/[id]/
│   │   │   ├── page.tsx            # Vote detail
│   │   │   ├── loading.tsx         # Vote detail skeleton
│   │   │   ├── error.tsx
│   │   │   └── not-found.tsx       # Vote not found
│   │   └── search/
│   │       ├── page.tsx            # Search (client)
│   │       └── error.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (Badge, Card, Table, etc.)
│   │   ├── vote-card.tsx
│   │   ├── vote-bar.tsx
│   │   ├── vote-status-badge.tsx
│   │   ├── party-badge.tsx
│   │   ├── party-table.tsx
│   │   ├── party-vote-groups.tsx
│   │   ├── search-bar.tsx
│   │   └── load-more-button.tsx
│   ├── lib/
│   │   ├── oda/
│   │   │   ├── client.ts           # ODA API fetcher (KV cache-aware, rate-limited)
│   │   │   ├── types.ts            # ODA API response types
│   │   │   └── mapper.ts           # ODA → VoteSummary transform (incl. biografi XML parsing)
│   │   ├── ai/
│   │   │   └── summarizer.ts       # Vercel AI SDK prompt + call + KV cache
│   │   ├── kv/
│   │   │   └── client.ts           # Vercel KV wrapper (get/set with TTL helpers)
│   │   ├── actions/
│   │   │   ├── search.ts           # Server Action: search votes
│   │   │   └── load-more.ts        # Server Action: paginate votes
│   │   ├── config.ts               # All configuration
│   │   └── parties.ts              # Party colors and names
│   └── types/
│       └── vote.ts                 # VoteSummary, PartyVote, VoteTotals
├── public/
├── vercel.json                     # Vercel deployment config (if needed)
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

**Changes from SQLite version:**
- Removed `lib/db/` directory entirely
- Removed `lib/ai/cache.ts` (caching now in `summarizer.ts` via KV)
- Added `lib/kv/client.ts` — thin wrapper around `@vercel/kv`
- Removed `data/` directory (no local database)
- Added `vercel.json` for deployment configuration

## Deployment

### Vercel setup

1. Connect GitHub repo to Vercel
2. Create a Vercel KV store (Dashboard → Storage → KV) — auto-populates `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Vercel AI Gateway credits are included with the account ($5/30 days free)
4. Set optional env vars for model/TTL overrides
5. Deploy — ISR, Server Actions, and KV work out of the box

### Vercel free tier limits

| Resource | Free limit | Our usage estimate |
|----------|-----------|-------------------|
| KV storage | 256 MB | ~10-50 MB (thousands of cached votes + summaries) |
| KV requests | 30,000/day | ~1,000-5,000/day (depends on traffic) |
| AI Gateway | $5/30 days | ~$0.50-2/month (short summaries, cheap model) |
| Serverless functions | 100 GB-hrs | Well within limits for ISR |
| Bandwidth | 100 GB/month | Static-heavy, minimal |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| ODA API timeout/500 | Serve cached data from KV if available, otherwise show friendly error page |
| ODA API 429/503 | Retry up to 3 times with exponential backoff |
| Afstemning without `sagstrinid` | Show vote with "Ingen tilknyttet lovforslag" instead of resume |
| Aktør with missing/unparseable `biografi` | Fallback to "UFG" with grey color |
| Empty `resume` on Sag | Show `titel` instead |
| Unknown party not in color map | Grey badge with abbreviation |
| AI Gateway failure / credits exhausted | Show official resume only, log error, no cached summary stored |
| Invalid vote ID (`/vote/[id]`) | Render `not-found.tsx` with 404 status |
| Vercel KV unavailable | Bypass cache, fetch directly from ODA (degraded performance) |
| Search returns no results | Clear message with suggestion to adjust search term |

## Search

- Uses **Server Actions** called from the client-side `SearchBar` component
- Searches `Sag.titel` and `Sag.titelkort` via ODA `$filter=contains()`
- Debounced input (300ms) on client, Server Action performs the ODA query
- Results returned as `VoteSummary[]` and rendered as `VoteCard` list
- Pagination via "Vis flere" Server Action with `$skip`/`$top`
- Search results are cached in Vercel KV with the query hash as key
