# Ongoing Regatta Card — Design

**Date:** 2026-05-12
**Status:** Draft for implementation
**Owner:** James Juhasz / Claude

## Problem

When James is currently racing at a regatta, the site has no way to surface that. The Results page (`/results`) shows past results only — gated on `startDate < today` in `src/lib/results.ts`. World Sailing, the authoritative source for past results, does not publish an entry until after the regatta ends. So between the first start gun and the final scoring, the donor-facing surfaces are blind to the live event.

The campaign's primary goal is donation conversion. A live "racing now" signal — with a real placement scraped from the live scoreboard — is a strong engagement hook that the current build cannot deliver.

## Goal

Detect when an event from the events index is currently in progress, scrape the live scoreboard from our known regatta hosts (not World Sailing, not Google News), and render an **Ongoing** card on both the Results page and the home page.

## Non-goals

- Per-race scoreline parsing ("Race 4: 5th"). Position + fleet + total competitors is enough — same shape as a finished `Result`.
- Real-time push / websockets. A 30-minute scrape cadence is sufficient.
- A new admin UI for entering live results URLs. The existing scrape discovery pipeline (`src/lib/scrape/discover.ts`) already finds them.
- Backfill of historical ongoing data. Cards exist only while a regatta is live.

## Architecture

### Detection — pure date arithmetic

A new helper in `src/lib/events.ts`:

```ts
export async function getOngoingRegattas(today?: string): Promise<SeedEvent[]>
```

- Reads from **three sources** in parallel and unions by normalized title + start date:
  1. Admin DB events (`listEvents()` — same load as `loadAdminEvents()` already does internally). Authoritative when present.
  2. World Sailing past events (`getWorldSailingPastEvents()`) — typically empty for ongoing, included for completeness.
  3. CoachAible upcoming events (`fetchUpcoming(50)` → `consolidateEvents()`) — CoachAible's `/calendar/upcoming` endpoint returns events with `startDate ≥ today - 7d` per its current contract, which includes regattas that just started. This is the safety net when an admin entry was forgotten.
- Filters to entries where `category === "Regatta"` (admin/WS) or `eventType === "race"` (CoachAible) and `startDate ≤ today ≤ endDate`, with `today` defaulting to `new Date().toISOString().slice(0, 10)`.
- The `today` parameter exists for testability only.
- Returns zero, one, or rarely two events.

Cheap: at most one DB query + two API calls, all cached. Safe to call on every page render.

Note: `getEventsIndex()` deliberately does not include CoachAible upcoming (per its existing comment — those are high-churn). `getOngoingRegattas()` is intentionally separate so it can pull from CoachAible without polluting the broader events index.

### Scraping — reuse `src/lib/scrape/`, new entrypoint

The existing scrape package already does exactly what we need for past WS events:

1. `src/lib/scrape/discover.ts` — three-layer candidate URL discovery:
   - Layer 1: WS `regattaWebsite` (not available for ongoing — WS hasn't published)
   - Layer 2: Adapter year-archive scans against known hosts (manage2sail, sailwave, regattanetwork, yachtscoring, sailing.org, trofeoprincesasofia.org, semaineolympique.com, scoring.sailti.com, etc.) — matches on title + year, works without WS data
   - Layer 3: Brave Search backstop — keyed on title + year + "results"
2. `src/lib/scrape/extract-html.ts`, `extract-pdf.ts`, `extract-playwright.ts` — extractors that find the row containing "juhasz" and parse position, fleet, total competitors.
3. `src/lib/scrape/score.ts` and `source-tier.ts` — relevance and trust guards that prevent wrong-person matches.

For ongoing regattas, only Layers 2 and 3 apply. The new entrypoint bootstraps a `WSEventLite`-shaped record from the ongoing event:

```ts
const ws: WSEventLite = {
  title: event.title,
  startDate: event.eventDate,
  endDate: event.endDate ?? event.eventDate,
  regattaWebsite: null,
  regattaCode: null,
  // ...any other required fields, all null/empty
};
```

Then it calls `buildCandidates(ws)` and runs the standard extractor pipeline.

### Script — `scripts/fetch-ongoing-results.ts`

New script, mirrors `scripts/fetch-results.ts` in style.

- Loads `getOngoingRegattas()` (server-side, with `DATABASE_URL` available).
- For each ongoing event:
  - **Discovery cache check (critical):** if `results-ongoing.json` already has a `resolvedUrl` for this event slug from a prior run, **skip the discover layer entirely** and re-fetch that URL directly. Only run `buildCandidates()` + extractors the first time we see a new ongoing regatta (or if the cached URL stops returning a valid extraction for N consecutive runs — see invalidation below).
  - Otherwise, run the discover + extract pipeline. Persist the winning URL as `resolvedUrl` on the entry so subsequent runs reuse it.
- Writes to a new file `src/data/results-ongoing.json`:

```json
{
  "items": [
    {
      "slug": "trofeo-princesa-sofia-2026",
      "title": "Trofeo Princesa Sofía 2026",
      "startDate": "2026-05-10",
      "endDate": "2026-05-14",
      "position": "7",
      "totalCompetitors": 64,
      "fleet": "ILCA 7 Open",
      "externalUrl": "https://...",
      "noticeBoardUrl": "https://www.manage2sail.com/.../Documents.aspx?...",
      "source": "manage2sail.com",
      "resolvedUrl": "https://www.manage2sail.com/.../Result.aspx?...",
      "resolvedAt": "2026-05-10T08:14:00Z",
      "failedExtractions": 0,
      "scrapedAt": "2026-05-12T14:23:00Z"
    }
  ]
}
```

**Why this matters:** the discover layer can invoke Brave Search (Layer 3 backstop), which has a 2000-query/month free tier. Re-running discovery every 30 minutes for the duration of a 5-day regatta would burn ~240 queries per regatta in the worst case. Caching `resolvedUrl` drops this to roughly **one Brave query per regatta**.

**Cache invalidation:** if a scrape against `resolvedUrl` fails to extract a "juhasz" row for **3 consecutive runs**, increment `failedExtractions`. On the next run after that, clear `resolvedUrl` and re-run discovery. This handles the case where the regatta site changes URL structure mid-event or the cached URL points at a stale page. The threshold balances "don't re-discover for transient network hiccups" against "don't go silent for an entire regatta if the URL is genuinely dead."

**Online Notice Board (ONB) URL:** alongside `resolvedUrl`, the script also persists a `noticeBoardUrl` per event. The ONB is where race documents, sailing instructions, results PDFs, and announcements are posted; on most regatta-management platforms (manage2sail, sailwave, regattanetwork) results are linked from the ONB, so during discovery we frequently visit the ONB on the way to the results page. The script captures it in two ways:

1. **Per-source derivation (preferred):** new helpers in `src/lib/scrape/adapters.ts` for each source we already adapt. E.g. for manage2sail, the ONB lives at a known sibling path of the results page (`/Documents.aspx` style). Each adapter that defines a results derivation also defines an `onbUrl(resolvedUrl)` helper. Zero extra fetches.
2. **Crawl-time capture (fallback):** when no per-source derivation exists, during discovery the extractor looks for an in-page anchor whose visible text or `href` matches `/notice ?board|^onb$|documents|sailing instructions/i` on the regatta's event landing page and stores its absolute URL.

The ONB URL is cached for the regatta's lifetime (same lifecycle as `resolvedUrl`) — derived once, reused on every subsequent run, never causes a Brave query.

- Idempotent: each run overwrites the file with the current set of ongoing events. Entries whose `endDate < today` are dropped (this is also the pruning mechanism).
- Flags: `--dry` (no write), `--limit=N` (cap per run), `--force-rediscover=<slug>` (clear `resolvedUrl` for a specific event and re-run discovery — escape hatch for when the cached URL is wrong).
- New npm script: `"results:fetch-ongoing": "tsx scripts/fetch-ongoing-results.ts"`.

### Refresh cadence — cron

Cron runs every 30 minutes via Railway cron (configured in `railway.toml`, mirroring the existing daily `results:fetch` cadence).

- When no regatta is ongoing, the script exits in < 1 second with an empty file write — zero scrape cost.
- The 30-minute cadence is plenty for donor-facing display (scoreboards typically update once per race, every few hours).
- Manual runs via `npm run results:fetch-ongoing` are always available.

### Read path — extend `Result` type

In `src/lib/results.ts`:

```ts
export type Result = {
  // ...existing fields
  status?: "past" | "ongoing";       // default "past"
  dayOfRegatta?: { current: number; total: number };  // ongoing only
  lastUpdated?: string;               // ISO, ongoing only
  noticeBoardUrl?: string;            // ongoing only — link to the regatta's Online Notice Board
};

export async function getOngoingResults(today?: string): Promise<Result[]>
```

`getOngoingResults()`:

1. Loads `getOngoingRegattas()`.
2. Loads `src/data/results-ongoing.json`.
3. For each ongoing regatta, looks up the matching JSON entry (by slug). If found, builds a `Result` with `status: "ongoing"`, scraped position/fleet/total, and computed `dayOfRegatta`. If not, builds a `Result` with `status: "ongoing"` but `position: null` (card will render "Position not yet available — race in progress").
4. `dayOfRegatta.current = today - startDate + 1`, `total = endDate - startDate + 1`.
5. Returns sorted by `startDate` descending.

The existing `getResults()` is unchanged — it still returns past results only. The two are composed at the page level.

### UI

#### Badge

A new `Badge` tone `"ongoing"`. Label: `"Ongoing"`. Visually distinct from `"donate"` (which is reserved for CTA emphasis) and `"navy"` / `"sand"` (used for upcoming/past). The ongoing tone uses a saturated accent color with a small leading pulse-dot (CSS animation, no JS) to read as live without being noisy.

#### `ResultCard` extension

`ResultCard` accepts the existing `Result` shape. The component gains a single conditional branch on `result.status === "ongoing"`:

- Badge slot shows the `"Ongoing"` tone instead of the year/past-result indicator.
- Position line:
  - With data: `"Currently 7th of 64 · ILCA 7 Open"`
  - Without data: `"Position not yet available — race in progress"` (rendered in `text-ink-3` muted style)
- New subline below the title (only present for ongoing): `"Day 2 of 5 · Updated 14 min ago"`, computed from `dayOfRegatta` and `lastUpdated`. "Updated …" uses relative time; falls back to absolute if `> 24h`.
- **Two external links** rendered side by side (each only shown if its URL is present):
  - `"Live scoreboard ↗"` — points at `result.externalUrl` (the resolved results page).
  - `"Notice board ↗"` — points at `result.noticeBoardUrl` (the regatta's ONB). The ONB hosts race documents, sailing instructions, results PDFs, and announcements — it's where the live scoreboard typically links from, so it gives donors broader race context beyond just the placement.

No new card component — reuse `ResultCard` to keep visual consistency and minimize surface area. The conditional branches are additive — past-result rendering is unchanged.

#### Results page (`/results`)

In `src/app/results/page.tsx`:

- Load both `getResults()` and `getOngoingResults()` in parallel.
- Pass ongoing entries to `ResultsFilter` as a separate prop.
- `ResultsFilter` renders ongoing cards at the top of the grid, always visible regardless of the active year tab. A small section header `"Racing now"` precedes them.
- Stat tiles (Regattas raced, Podiums, Top-10s, Countries) are unchanged — ongoing events don't count toward "raced" until they complete.

#### Home page (`/`)

A new "Racing now" section inserted in `src/app/page.tsx` directly after the hero block (which currently ends with the newsletter subscribe CTA — see commit `883dd25 feat(newsletters): add subscribe CTA to hero`) and immediately before the "Next up" section that consumes `coachaibleNextUp`. Renders one `ResultCard` per ongoing regatta in `size="lg"`. The section returns `null` (no header, no whitespace, no container padding) when no regatta is ongoing — implemented as an early-return inside a `RacingNowSection` component that takes the ongoing array.

### Caching

- Both `/` and `/results` already have `revalidate = 60` (results page) and similar (home page). The page-level `revalidate` is sufficient to pick up JSON file changes within a minute of cron writing them — no extra cache work needed.
- The JSON file is read with Next.js's standard file-import semantics (already used by `results-auto.json`).

## Edge cases

| Case | Behavior |
|---|---|
| No ongoing regatta | Nothing renders on either page. Zero visual cost. |
| Multiple ongoing regattas | Both cards render, sorted by `startDate` descending. |
| Scraper found nothing yet (Day 1, scoreboard not live) | Card renders with "Racing now" + dates + "Position not yet available." Donor hook intact. |
| Scraper finds wrong person | Existing `src/lib/scrape/score.ts` requires "juhasz" row match; wrong-person hits are filtered upstream. |
| Regatta just ended, JSON stale | Read-side filter drops entries where `endDate < today`. Cron also prunes on next run. |
| Cron failed for hours | Card still shows "race in progress" with last-known position. `lastUpdated` line makes staleness visible. |
| Brave Search API key absent | Discover layer skips Layer 3, returns only Layer 2 results. Card may show "Position not yet available" longer, but still renders. |
| Cached `resolvedUrl` extraction fails 3 runs in a row | Cache invalidated; full discovery re-runs on the next run. One extra Brave query at worst. |
| Database unavailable | `getEventsIndex()` falls back to WS-only (existing behavior). WS won't have ongoing entries, so ongoing card simply doesn't render. Graceful degrade. |

## Testing

- Unit test `getOngoingRegattas()` with synthetic events spanning various `today` values.
- Unit test `getOngoingResults()` with synthetic ongoing events × scraped JSON entries (with/without matches, with/without scraped position).
- Integration test the script with `--dry` against a fixture event (CoachAible mocked).
- Manual verification: temporarily add an admin event with `startDate = today - 1`, `endDate = today + 2`, run `npm run results:fetch-ongoing`, verify card renders.

## Out of scope

- A new dedicated `OngoingResultCard` component — reuse `ResultCard`.
- Push notifications when a position changes.
- Per-race result history during the regatta.
- Auto-discovery of regatta sites not in our adapter list — out of scope; relies on Brave backstop.
- An admin UI for overriding the live results URL — relies on the existing discovery pipeline.

## File-level change summary

| File | Change |
|---|---|
| `src/lib/events.ts` | Add `getOngoingRegattas()` |
| `src/lib/results.ts` | Add `getOngoingResults()`, extend `Result` type with `status`, `dayOfRegatta`, `lastUpdated` |
| `src/data/results-ongoing.json` | New data file |
| `scripts/fetch-ongoing-results.ts` | New script |
| `package.json` | Add `results:fetch-ongoing` npm script |
| `railway.toml` | Add cron entry for ongoing scrape (every 30 min) |
| `src/components/ui/Badge.tsx` | Add `"ongoing"` tone |
| `src/components/cards/ResultCard.tsx` | Render ongoing variant |
| `src/components/sections/ResultsFilter.tsx` | Accept and render ongoing cards above the grid |
| `src/app/results/page.tsx` | Load and pass ongoing data |
| `src/app/page.tsx` | Add "Racing now" section under hero |
