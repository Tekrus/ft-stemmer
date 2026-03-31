# Feature Bundle Design: 9 New Features for FT Stemmer

**Date:** 2026-03-31

## Redis Strategy (applies to ALL features)

Raw ODA responses are never cached in Redis. All new data fetching uses `fetchOdaRaw` (plain fetch, no Redis). Only small processed results are cached:

| What gets cached | Example key | Approx size | TTL |
|---|---|---|---|
| Processed MP voting summary | `mp-votes:{aktørId}` | ~2KB | 3h |
| Topic vote list | `topic:{emneordId}:skip={n}` | ~3KB | 3h |
| Sag sponsors | `sag-sponsors:{sagId}` | ~200B | permanent |
| Sag emneord | `sag-topics:{sagId}` | ~300B | permanent |
| Related sager | `sag-related:{sagId}` | ~500B | permanent |

Everything else uses Next.js `revalidate` (ISR) or client-side fetching with no Redis.

---

## Feature 1: MP Profiles & Individual Voting Records

**Route:** `/member/[id]`  
**ODA entities:** `Aktør` (typeid=5), `Stemme`, `AktørAktør`

**Page content:**
- Name, photo (from biografi XML `pictureMiRes`), party, constituency
- Voting stats: total votes, party loyalty %, absence rate
- Recent votes list showing how the MP voted (For/Imod/Fravær) with links to vote detail

**Data flow:**
- Server component fetches `Aktør` by id (uncached ODA call, page uses `revalidate = 10800`)
- Parse biografi XML for photo, party, constituency
- Fetch recent `Stemme` records for this aktør (last 50), expand `Afstemning/Sagstrin/Sag`
- Process into compact voting record, cache as `mp-votes:{id}` (~2KB, 3h TTL)
- Calculate party loyalty by comparing MP vote vs party majority vote

**Member search:** Add to existing `/search` page — a toggle or second tab "Søg efter medlem" that queries `Aktør?$filter=typeid eq 5 and substringof('{query}', navn)`. Results shown as compact cards linking to `/member/[id]`.

**Navigation:** Add "Medlemmer" link to site header.

---

## Feature 2: Topic-Based Browsing

**Route:** `/topic/[slug]` and topic listing on `/search`  
**ODA entities:** `Emneord`, `EmneordSag`, `Sag`, `Afstemning`

**Topic page content:**
- Topic name as heading
- List of votes tagged with this topic (reuses `VoteCard`)
- Load more pagination

**Data flow:**
- Fetch `EmneordSag?$filter=emneordid eq {id}&$expand=Sag` to get sager for this topic
- For each sag, find most recent afstemning via `Afstemning?$filter=Sagstrin/sagid eq {sagId}&$top=1&$orderby=opdateringsdato desc`
- This is expensive — batch and cache the processed result at `topic:{emneordId}:skip={n}` (3h TTL)

**Topic discovery:** On the `/search` page, show popular topics as clickable chips below the search bar (in addition to existing suggestion words). Fetch top emneord by frequency.

---

## Feature 3: "Who Proposed This?" on Vote Detail

**Enrichment to:** `/vote/[id]`  
**ODA entities:** `SagAktør`, `Aktør`, `SagAktørRolle`

**What it shows:**
- Below the vote title, show "Fremsat af: [Minister name]" or "Forslagsstiller: [MP name(s)]"
- Names link to `/member/[id]`

**Data flow:**
- Fetch `SagAktør?$filter=sagid eq {sagId}&$expand=Aktør,SagAktørRolle` (uncached ODA)
- Filter to roles: Forslagsstiller (16/19), Minister (14), Af (4)
- Cache processed result at `sag-sponsors:{sagId}` (~200B, permanent — sponsors don't change)
- Loaded lazily client-side to not slow down the main page render

---

## Feature 4: Party Loyalty Score

**Enrichment to:** `/party/[abbreviation]`  
**ODA entities:** `Stemme`, `Aktør`

**What it shows:**
- On the party page, a new section "Medlemmer" below the vote list
- Each MP shown with: name, photo, loyalty % (how often they vote with party majority)
- Sorted by loyalty (rebels at top are more interesting)

**Data flow:**
- For the party's recent votes (already fetched), we already have per-party vote counts
- Fetch `Stemme` for each afstemning, group by aktør, compare individual vote vs party majority
- This is expensive — only process the 15 most recent votes already shown on the page
- Calculate per-MP stats, sort by deviation
- Cache at `party-loyalty:{abbr}` (~3KB, 3h TTL)
- Loaded lazily client-side via API route `/api/party/loyalty?party=M`

---

## Feature 5: Vote Timeline / Session Overview

**Enrichment to:** `/` (dashboard)  
**ODA entities:** `Periode`, existing vote data

**What it shows:**
- Small bar chart or activity indicator above the vote list showing votes per week/month
- Current session name (e.g. "2025-1") shown in the hero section

**Data flow:**
- Votes already fetched for dashboard include dates
- Group client-side by week/month — no additional API calls needed
- Fetch current `Periode` once (one ODA call, cached by `fetchFromOda` as usual — tiny response)

**Implementation:** Pure client component using existing vote data. Minimal.

---

## Feature 6: Related Proposals (Sambehandlinger)

**Enrichment to:** `/vote/[id]`  
**ODA entities:** `Sambehandlinger`, `Sagstrin`, `Sag`

**What it shows:**
- Section "Relaterede forslag" on vote detail page
- Links to other sager that were debated together

**Data flow:**
- Fetch `Sambehandlinger?$filter=førstesagstrinid eq {sagstrinId} or andetsagstrinid eq {sagstrinId}&$expand=FørsteSagstrin/Sag,AndetSagstrin/Sag`
- Extract linked sag titles and find their most recent afstemning
- Cache at `sag-related:{sagId}` (~500B, permanent)
- Loaded lazily client-side

---

## Feature 7: Filter by Sag Type

**Enrichment to:** `/` (dashboard) and `/search`  
**ODA entities:** existing `Sag.typeid`

**What it shows:**
- Filter chips below the section heading: "Alle", "Lovforslag", "Beslutningsforslag", "Forespørgsler"
- Filters the displayed vote list

**Data flow:**
- `VoteSummary` already includes `number` which has a prefix (L = Lovforslag, B = Beslutningsforslag, V = Forespørgsel/Vedtagelse)
- Client-side filtering — no API changes needed
- Parse the number prefix to determine type

---

## Feature 8: Dashboard Vedtaget/Forkastet Filter

**Enrichment to:** `/` (dashboard)  
**ODA entities:** none — uses existing data

**What it shows:**
- Tabs above the vote list: "Alle", "Vedtaget", "Forkastet" (same line-style tabs as party/compare pages)
- Filters the displayed vote list

**Data flow:**
- Pure client-side filter on `vote.passed` — no API changes
- Combine with sag type filter (Feature 7) in the same filter bar

---

## Feature 9: Debate Links (Folketingstidende)

**Enrichment to:** `/vote/[id]`  
**ODA entities:** `Sagstrin.folketingstidendeurl`

**What it shows:**
- In the vote hero card, alongside existing ft.dk and retsinformation.dk links, add a "Debat" link when available
- Links to the Folketingstidende transcript of the debate

**Data flow:**
- `Sagstrin` already fetched in the vote detail page
- Just read `sagstrin.folketingstidendeurl` — no additional API call
- Add to `VoteSummary` type and mapper

---

## New Routes Summary

| Route | Type | Description |
|---|---|---|
| `/member/[id]` | Page | MP profile with voting history |
| `/topic/[slug]` | Page | Votes tagged with a topic |
| `/api/party/loyalty` | API | Party loyalty data (lazy load) |
| `/api/vote/sponsors` | API | Sag sponsors (lazy load) |
| `/api/vote/related` | API | Related sager (lazy load) |
| `/api/member/search` | API | Search MPs by name |

## Implementation Order

1. **Feature 9** (debate links) — trivial, no new routes
2. **Feature 7 + 8** (dashboard filters) — client-side only, no new data
3. **Feature 3** (sponsors on vote detail) — small API addition
4. **Feature 6** (related proposals) — small API addition  
5. **Feature 5** (timeline) — client component using existing data
6. **Feature 2** (topic browsing) — new route + ODA queries
7. **Feature 1** (MP profiles) — new route, most complex
8. **Feature 4** (party loyalty) — depends on MP data patterns from #1

## Files to Create/Modify

**New files (~12):**
- `src/app/member/[id]/page.tsx` — MP profile page
- `src/app/member/[id]/loading.tsx` — loading state
- `src/app/topic/[slug]/page.tsx` — topic page
- `src/app/api/party/loyalty/route.ts` — party loyalty API
- `src/app/api/vote/sponsors/route.ts` — sponsors API
- `src/app/api/vote/related/route.ts` — related sager API
- `src/app/api/member/search/route.ts` — MP search API
- `src/lib/oda/fetch-members.ts` — MP data fetching
- `src/lib/oda/fetch-topics.ts` — topic data fetching
- `src/lib/oda/fetch-sponsors.ts` — sponsor data fetching
- `src/lib/oda/fetch-related.ts` — related sager fetching
- `src/components/vote-timeline.tsx` — timeline visualization

**Modified files (~8):**
- `src/types/vote.ts` — add `debateUrl`, `sagType` fields
- `src/lib/oda/mapper.ts` — map new fields
- `src/lib/oda/types.ts` — add `folketingstidendeurl` to OdaSagstrin
- `src/app/vote/[id]/page.tsx` — add sponsors, related, debate link sections
- `src/app/page.tsx` — add timeline, filters (wrap in client component)
- `src/app/search/page.tsx` — add topic chips, member search tab
- `src/app/party/[abbreviation]/page.tsx` — add loyalty section
- `src/components/site-header.tsx` — add "Medlemmer" nav link
