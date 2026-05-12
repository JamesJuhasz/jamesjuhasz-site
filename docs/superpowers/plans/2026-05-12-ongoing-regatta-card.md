# Ongoing Regatta Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect when a regatta is currently in progress, scrape its live scoreboard from known regatta hosts, and render an "Ongoing" card on `/results` and `/`, with links to the live scoreboard, online notice board, and press recaps.

**Architecture:** Detection is pure date arithmetic against the existing events index plus CoachAible's upcoming feed. A new cron script (`scripts/fetch-ongoing-results.ts`) drives the existing `src/lib/scrape/` discover + extract pipeline, persisting both the scraped position and the resolved scoreboard / notice-board URLs to `src/data/results-ongoing.json`. Pages read the JSON at render time. The discovery layer runs once per regatta (cached `resolvedUrl`), keeping Brave Search usage to ~1 query/regatta.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Vitest, Drizzle/Postgres, tsx, JSDOM. Reuses `src/lib/scrape/{discover,extract-html,fetch}.ts` and `scripts/fetch-results.ts` patterns.

**Spec:** [docs/superpowers/specs/2026-05-12-ongoing-regatta-card-design.md](../specs/2026-05-12-ongoing-regatta-card-design.md)

---

## File Structure

**New files:**
- `src/data/results-ongoing.json` — scraper output, read by pages
- `src/lib/ongoing.ts` — `getOngoingRegattas()` + `getOngoingResults()` + types (kept separate from `events.ts`/`results.ts` so the new code is one focused module)
- `src/components/sections/RacingNowSection.tsx` — home-page section wrapper that early-returns null when empty
- `scripts/fetch-ongoing-results.ts` — cron script
- `tests/ongoing.test.ts` — unit tests for detection + result building
- `tests/press-for-event.test.ts` — unit tests for the press filter

**Modified files:**
- `src/lib/results.ts` — extend `Result` type with `status`, `dayOfRegatta`, `lastUpdated`, `noticeBoardUrl`
- `src/lib/press.ts` — add `getPressForEvent()`
- `src/components/ui/Badge.tsx` — add `"ongoing"` tone
- `src/components/cards/ResultCard.tsx` — ongoing branch
- `src/components/sections/ResultsFilter.tsx` — accept and render ongoing array above the grid
- `src/app/results/page.tsx` — load and pass ongoing data
- `src/app/page.tsx` — render `<RacingNowSection>` between hero and "Next up"
- `src/app/events/[slug]/page.tsx` — render press section
- `package.json` — `results:fetch-ongoing` script
- `railway.toml` — cron entry

---

## Task 1: Detection — `getOngoingRegattas()` with tests

**Files:**
- Create: `src/lib/ongoing.ts`
- Create: `tests/ongoing.test.ts`

- [ ] **Step 1.1: Write failing test for date arithmetic detection**

```ts
// tests/ongoing.test.ts
import { describe, expect, it } from "vitest";
import { isOngoing } from "../src/lib/ongoing";

describe("isOngoing", () => {
  it("returns true when today falls inside [startDate, endDate]", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-12")).toBe(true);
  });
  it("treats endpoints as inclusive", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-10")).toBe(true);
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-14")).toBe(true);
  });
  it("returns false before start and after end", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-09")).toBe(false);
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-15")).toBe(false);
  });
  it("handles single-day events (endDate == startDate)", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-10" }, "2026-05-10")).toBe(true);
  });
});
```

- [ ] **Step 1.2: Run test to verify failure**

Run: `npx vitest run tests/ongoing.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/ongoing'`

- [ ] **Step 1.3: Implement `isOngoing`**

```ts
// src/lib/ongoing.ts
import type { SeedEvent } from "@/lib/seed-data";

export type OngoingRegatta = {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  coverImage?: { url: string; alt?: string };
};

/** Pure date predicate. ISO yyyy-mm-dd strings; inclusive on both ends. */
export function isOngoing(
  range: { startDate: string; endDate: string },
  today: string,
): boolean {
  return today >= range.startDate && today <= range.endDate;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 1.4: Run test to verify pass**

Run: `npx vitest run tests/ongoing.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 1.5: Add test for `getOngoingRegattas` event-source merge**

```ts
// append to tests/ongoing.test.ts
import { mergeOngoingSources } from "../src/lib/ongoing";

describe("mergeOngoingSources", () => {
  const today = "2026-05-12";

  it("returns only regattas where today is within range", () => {
    const admin = [
      { slug: "a", title: "Sofia", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Regatta", status: "upcoming", excerpt: "", location: "Palma" },
      { slug: "b", title: "Old", eventDate: "2026-04-01", endDate: "2026-04-05", category: "Regatta", status: "past", excerpt: "", location: "x" },
      { slug: "c", title: "Future", eventDate: "2026-06-01", endDate: "2026-06-05", category: "Regatta", status: "upcoming", excerpt: "", location: "y" },
    ] as const;
    const result = mergeOngoingSources(admin as never, [], [], today);
    expect(result.map((r) => r.slug)).toEqual(["a"]);
  });

  it("skips non-Regatta categories", () => {
    const admin = [
      { slug: "t", title: "Training Block", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Training", status: "upcoming", excerpt: "", location: "x" },
    ] as const;
    const result = mergeOngoingSources(admin as never, [], [], today);
    expect(result).toEqual([]);
  });

  it("dedupes by normalized title across sources", () => {
    const admin = [
      { slug: "sofia-admin", title: "  Trofeo Princesa SOFIA  ", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Regatta", status: "upcoming", excerpt: "", location: "Palma" },
    ];
    const coachaible = [
      { id: "coachaible-42", title: "Trofeo Princesa Sofia", startDate: "2026-05-10", endDate: "2026-05-14", eventType: "race", racePriority: null, country: null },
    ];
    const result = mergeOngoingSources(admin as never, [], coachaible as never, today);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe("sofia-admin"); // admin wins
  });
});
```

- [ ] **Step 1.6: Run, observe failure, then implement `mergeOngoingSources`**

Run: `npx vitest run tests/ongoing.test.ts`
Expected: FAIL — `mergeOngoingSources is not exported`.

Then add to `src/lib/ongoing.ts`:

```ts
import type { ConsolidatedEvent } from "@/lib/coachaible";

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge three event sources, keep only "Regatta" type entries that overlap `today`,
 * and dedupe by normalized title (admin > WS > CoachAible on collision).
 * Pure: takes already-fetched arrays, no I/O.
 */
export function mergeOngoingSources(
  admin: SeedEvent[],
  ws: SeedEvent[],
  coachaible: ConsolidatedEvent[],
  today: string,
): OngoingRegatta[] {
  const byTitle = new Map<string, OngoingRegatta>();

  for (const e of coachaible) {
    if (e.eventType !== "race") continue;
    if (!isOngoing({ startDate: e.startDate, endDate: e.endDate }, today)) continue;
    byTitle.set(normalizeTitle(e.title), {
      slug: e.id, // coachaible-NN fallback slug
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
    });
  }
  for (const e of [...ws, ...admin]) {
    if (e.category !== "Regatta") continue;
    const end = e.endDate ?? e.eventDate;
    if (!isOngoing({ startDate: e.eventDate, endDate: end }, today)) continue;
    byTitle.set(normalizeTitle(e.title), {
      slug: e.slug,
      title: e.title,
      startDate: e.eventDate,
      endDate: end,
      location: e.location,
      coverImage: e.coverImage
        ? { url: e.coverImage.asset.url, alt: e.coverImage.alt }
        : undefined,
    });
  }
  return Array.from(byTitle.values()).sort((a, b) =>
    a.startDate < b.startDate ? 1 : -1,
  );
}
```

Run again: PASS (3 tests added → 7 total).

- [ ] **Step 1.7: Add public async loader `getOngoingRegattas`**

Append to `src/lib/ongoing.ts`:

```ts
import { fetchUpcoming, consolidateEvents } from "@/lib/coachaible";
import { getWorldSailingPastEvents } from "@/lib/world-sailing";

async function loadAdminEvents(): Promise<SeedEvent[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { listEvents } = await import("@/lib/admin/store/events");
    const rows = await listEvents();
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      eventDate: r.eventDate,
      endDate: r.endDate ?? undefined,
      location: r.location,
      category: r.category as "Regatta" | "Training" | "Coaching",
      status: "upcoming",
      excerpt: "",
      coverImage: r.coverImageUrl
        ? { asset: { url: r.coverImageUrl }, alt: r.coverImageAlt ?? undefined }
        : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getOngoingRegattas(today?: string): Promise<OngoingRegatta[]> {
  const t = today ?? todayIso();
  const [admin, ws, upcomingRaw] = await Promise.all([
    loadAdminEvents(),
    Promise.resolve(getWorldSailingPastEvents()),
    fetchUpcoming(50),
  ]);
  const coachaible = upcomingRaw ? consolidateEvents(upcomingRaw.events) : [];
  return mergeOngoingSources(admin, ws, coachaible, t);
}
```

- [ ] **Step 1.8: Commit**

```bash
git add src/lib/ongoing.ts tests/ongoing.test.ts
git commit -m "feat(ongoing): detection helpers for currently-racing regattas"
```

---

## Task 2: Extend `Result` type

**Files:**
- Modify: `src/lib/results.ts`

- [ ] **Step 2.1: Add optional fields to `Result` type**

In `src/lib/results.ts`, locate the `Result` type (around line 26) and add four optional fields at the end:

```ts
export type Result = {
  // ...existing fields unchanged
  status?: "past" | "ongoing";
  dayOfRegatta?: { current: number; total: number };
  lastUpdated?: string; // ISO timestamp
  noticeBoardUrl?: string;
};
```

- [ ] **Step 2.2: Verify type compiles (no new code)**

Run: `npx tsc --noEmit`
Expected: PASS — no errors. Existing `Result` consumers don't break because all new fields are optional.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/results.ts
git commit -m "feat(results): extend Result type for ongoing-regatta variant"
```

---

## Task 3: `getOngoingResults()` — join detection with scraper JSON

**Files:**
- Modify: `src/lib/ongoing.ts`
- Modify: `tests/ongoing.test.ts`
- Create: `src/data/results-ongoing.json`

- [ ] **Step 3.1: Create the data file (empty starter)**

```bash
cat > src/data/results-ongoing.json << 'EOF'
{
  "items": []
}
EOF
```

The file must exist before TypeScript can import it. Format:

```json
{
  "items": [
    {
      "slug": "...",
      "title": "...",
      "startDate": "yyyy-mm-dd",
      "endDate": "yyyy-mm-dd",
      "position": "7" or null,
      "totalCompetitors": 64 or null,
      "fleet": "ILCA 7 Open" or null,
      "externalUrl": "https://..." or null,
      "noticeBoardUrl": "https://..." or null,
      "source": "manage2sail.com" or null,
      "resolvedUrl": "https://..." or null,
      "resolvedAt": "ISO ts" or null,
      "failedExtractions": 0,
      "scrapedAt": "ISO ts" or null
    }
  ]
}
```

- [ ] **Step 3.2: Write failing test for `buildOngoingResults`**

Append to `tests/ongoing.test.ts`:

```ts
import { buildOngoingResults } from "../src/lib/ongoing";

describe("buildOngoingResults", () => {
  const today = "2026-05-12";
  const regatta = {
    slug: "sofia-2026",
    title: "Trofeo Princesa Sofia 2026",
    startDate: "2026-05-10",
    endDate: "2026-05-14",
    location: "Palma de Mallorca",
  };

  it("computes day-of-regatta from today and date range", () => {
    const [r] = buildOngoingResults([regatta], { items: [] }, today);
    expect(r.dayOfRegatta).toEqual({ current: 3, total: 5 });
    expect(r.status).toBe("ongoing");
    expect(r.position).toBeNull();
  });

  it("joins scraped row by slug and surfaces position + URLs", () => {
    const scraped = {
      items: [{
        slug: "sofia-2026",
        title: regatta.title,
        startDate: regatta.startDate,
        endDate: regatta.endDate,
        position: "7",
        totalCompetitors: 64,
        fleet: "ILCA 7 Open",
        externalUrl: "https://example.com/results",
        noticeBoardUrl: "https://example.com/notices",
        source: "manage2sail.com",
        resolvedUrl: "https://example.com/results",
        resolvedAt: "2026-05-10T08:14:00Z",
        failedExtractions: 0,
        scrapedAt: "2026-05-12T14:23:00Z",
      }],
    };
    const [r] = buildOngoingResults([regatta], scraped, today);
    expect(r.position).toBe("7");
    expect(r.totalCompetitors).toBe(64);
    expect(r.fleet).toBe("ILCA 7 Open");
    expect(r.externalUrl).toBe("https://example.com/results");
    expect(r.noticeBoardUrl).toBe("https://example.com/notices");
    expect(r.lastUpdated).toBe("2026-05-12T14:23:00Z");
  });

  it("returns empty array when no ongoing regattas", () => {
    expect(buildOngoingResults([], { items: [] }, today)).toEqual([]);
  });
});
```

- [ ] **Step 3.3: Run test to verify failure**

Run: `npx vitest run tests/ongoing.test.ts`
Expected: FAIL — `buildOngoingResults is not exported`

- [ ] **Step 3.4: Implement `buildOngoingResults` and JSON shape**

Append to `src/lib/ongoing.ts`:

```ts
import type { Result } from "@/lib/results";

export type OngoingScrapedItem = {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
  externalUrl: string | null;
  noticeBoardUrl: string | null;
  source: string | null;
  resolvedUrl: string | null;
  resolvedAt: string | null;
  failedExtractions: number;
  scrapedAt: string | null;
};

export type OngoingScrapedFile = {
  items: OngoingScrapedItem[];
};

function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Pure join: detected regattas × scraped JSON → Result[] with status="ongoing". */
export function buildOngoingResults(
  regattas: OngoingRegatta[],
  scraped: OngoingScrapedFile,
  today: string,
): Result[] {
  const bySlug = new Map(scraped.items.map((it) => [it.slug, it]));
  return regattas.map((r) => {
    const s = bySlug.get(r.slug);
    return {
      id: `ongoing-${r.slug}`,
      title: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      country: null,
      position: s?.position ?? null,
      totalCompetitors: s?.totalCompetitors ?? null,
      fleet: s?.fleet ?? null,
      externalUrl: s?.externalUrl ?? null,
      source: s?.source ?? null,
      coverImage: r.coverImage,
      slug: r.slug,
      location: r.location,
      status: "ongoing",
      dayOfRegatta: {
        current: Math.min(daysInclusive(r.startDate, today), daysInclusive(r.startDate, r.endDate)),
        total: daysInclusive(r.startDate, r.endDate),
      },
      lastUpdated: s?.scrapedAt ?? undefined,
      noticeBoardUrl: s?.noticeBoardUrl ?? undefined,
    };
  });
}
```

- [ ] **Step 3.5: Run test to verify pass**

Run: `npx vitest run tests/ongoing.test.ts`
Expected: PASS (10 tests total).

- [ ] **Step 3.6: Add public `getOngoingResults()` loader**

Append to `src/lib/ongoing.ts`:

```ts
import scrapedOngoing from "@/data/results-ongoing.json";

export async function getOngoingResults(today?: string): Promise<Result[]> {
  const t = today ?? todayIso();
  const regattas = await getOngoingRegattas(t);
  return buildOngoingResults(regattas, scrapedOngoing as OngoingScrapedFile, t);
}
```

- [ ] **Step 3.7: Type-check and commit**

```bash
npx tsc --noEmit
git add src/lib/ongoing.ts src/data/results-ongoing.json tests/ongoing.test.ts
git commit -m "feat(ongoing): join detected regattas with scraped JSON into Result[]"
```

---

## Task 4: Press filter — `getPressForEvent()`

**Files:**
- Modify: `src/lib/press.ts`
- Create: `tests/press-for-event.test.ts`

- [ ] **Step 4.1: Write failing test**

```ts
// tests/press-for-event.test.ts
import { describe, expect, it } from "vitest";
import { filterPressForEvent } from "../src/lib/press";
import type { SeedPress } from "../src/lib/seed-data";

const press: SeedPress[] = [
  { articleTitle: "Juhasz strong at Trofeo Princesa Sofia day 2", publication: "Sail-World", publishedAt: "2026-05-11", externalUrl: "https://a.example/1", excerpt: "Day 2 recap", imageUrl: null },
  { articleTitle: "Unrelated piece on rigging", publication: "Sail-World", publishedAt: "2026-05-11", externalUrl: "https://a.example/2", excerpt: "", imageUrl: null },
  { articleTitle: "Sofia preview", publication: "World Sailing", publishedAt: "2026-04-01", externalUrl: "https://a.example/3", excerpt: "Preview of Trofeo Princesa Sofia", imageUrl: null },
  { articleTitle: "Way after the event", publication: "x", publishedAt: "2026-08-01", externalUrl: "https://a.example/4", excerpt: "Trofeo Princesa Sofia recap", imageUrl: null },
];

describe("filterPressForEvent", () => {
  it("matches articles whose title or excerpt contains the regatta title within the window", () => {
    const out = filterPressForEvent(press, {
      title: "Trofeo Princesa Sofia",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out.map((p) => p.externalUrl)).toEqual([
      "https://a.example/1",
      "https://a.example/3",
    ]);
  });

  it("excludes articles outside [startDate - 7d, endDate + 30d]", () => {
    const out = filterPressForEvent(press, {
      title: "Trofeo Princesa Sofia",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out.find((p) => p.externalUrl === "https://a.example/4")).toBeUndefined();
  });

  it("returns empty array when no matches", () => {
    const out = filterPressForEvent(press, {
      title: "Unrelated Regatta",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 4.2: Run test, observe failure**

Run: `npx vitest run tests/press-for-event.test.ts`
Expected: FAIL — `filterPressForEvent is not exported`.

- [ ] **Step 4.3: Implement `filterPressForEvent` and async `getPressForEvent`**

In `src/lib/press.ts`, append (do not touch `getPressMentions`):

```ts
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pure filter — extracted for testability. */
export function filterPressForEvent(
  press: SeedPress[],
  event: { title: string; startDate: string; endDate: string },
): SeedPress[] {
  const needle = normalize(event.title);
  const from = shiftDate(event.startDate, -7);
  const to = shiftDate(event.endDate, 30);
  return press.filter((p) => {
    const hay = `${normalize(p.articleTitle)} ${normalize(p.excerpt ?? "")}`;
    if (!hay.includes(needle)) return false;
    const when = p.publishedAt.slice(0, 10);
    return when >= from && when <= to;
  });
}

export async function getPressForEvent(event: {
  title: string;
  startDate: string;
  endDate: string;
}): Promise<SeedPress[]> {
  const all = await getPressMentions();
  return filterPressForEvent(all, event);
}
```

- [ ] **Step 4.4: Run test to verify pass**

Run: `npx vitest run tests/press-for-event.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/press.ts tests/press-for-event.test.ts
git commit -m "feat(press): filter helper for event-scoped press recaps"
```

---

## Task 5: Badge `"ongoing"` tone

**Files:**
- Modify: `src/components/ui/Badge.tsx`

- [ ] **Step 5.1: Add the tone**

In `src/components/ui/Badge.tsx`, replace the `Tone` type and `toneStyles` map:

```ts
type Tone = "default" | "ink" | "fog" | "red" | "navy" | "sand" | "donate" | "ongoing";

const toneStyles: Record<Tone, string> = {
  default: "bg-fog text-ink ring-1 ring-mist",
  ink: "bg-ink text-paper",
  fog: "bg-fog text-ink ring-1 ring-mist",
  red: "bg-red text-paper",
  navy: "bg-ink text-paper",
  sand: "bg-fog text-ink ring-1 ring-mist",
  donate: "bg-red text-paper",
  // Saturated live tone, distinct from the donate CTA red. Pulse-dot rendered
  // by the consumer (ResultCard) via a leading <span>.
  ongoing: "bg-emerald-600 text-paper",
};
```

- [ ] **Step 5.2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/ui/Badge.tsx
git commit -m "feat(ui): add ongoing tone to Badge"
```

---

## Task 6: `ResultCard` ongoing variant

**Files:**
- Modify: `src/components/cards/ResultCard.tsx`

- [ ] **Step 6.1: Add a relative-time helper above the component**

In `src/components/cards/ResultCard.tsx`, after the existing `formatRange` function, add:

```ts
function relativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.max(0, Math.round((now - then) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(iso).toISOString().slice(0, 10);
}
```

- [ ] **Step 6.2: Add the ongoing branch — imports**

Add `Radio` to the lucide imports at the top:

```ts
import { ArrowUpRight, MapPin, Radio, Search, Trophy } from "lucide-react";
```

- [ ] **Step 6.3: Render the ongoing badge + subline + position fallback + links**

Inside `ResultCard`, after the `const hasPendingUrl = ...` line, add:

```ts
const isOngoing = result.status === "ongoing";
const hasNoticeBoard = isOngoing && Boolean(result.noticeBoardUrl);
const hasPressRecaps = isOngoing && Boolean(result.slug); // event-page section handles empty case
```

Then replace the existing position-line block (`{hasResult ? ... : ...}`) with this superset:

```tsx
{isOngoing ? (
  <p className="text-caption text-ink-3">
    {result.dayOfRegatta
      ? `Day ${result.dayOfRegatta.current} of ${result.dayOfRegatta.total}`
      : null}
    {result.lastUpdated
      ? ` · Updated ${relativeFromNow(result.lastUpdated)}`
      : null}
  </p>
) : null}

{hasResult ? (
  <p className="mt-2 font-display text-h4 text-ink">
    {isOngoing ? "Currently " : null}
    {result.position}
    {result.totalCompetitors ? (
      <span className="text-ink-3"> of {result.totalCompetitors}</span>
    ) : null}
    {isOngoing && result.fleet ? (
      <span className="text-ink-3"> · {result.fleet}</span>
    ) : null}
  </p>
) : isOngoing ? (
  <p className="mt-2 text-body text-ink-3">
    Position not yet available — race in progress
  </p>
) : (
  <div className="mt-2">
    <Badge tone="fog">Result coming</Badge>
  </div>
)}
```

- [ ] **Step 6.4: Replace the country-badge with an ongoing-badge when ongoing**

Replace the existing `{result.country ? ... : null}` block (the top-left image overlay) with:

```tsx
{isOngoing ? (
  <div className="absolute top-3 left-3 z-10">
    <Badge tone="ongoing">
      <span className="inline-block w-2 h-2 rounded-full bg-paper animate-pulse" aria-hidden />
      Ongoing
    </Badge>
  </div>
) : result.country ? (
  <div className="absolute top-3 left-3 z-10">
    <Badge tone="sand">{result.country}</Badge>
  </div>
) : null}
```

- [ ] **Step 6.5: Add the three-link footer (replace the existing footer block)**

Replace the existing `<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption">...</div>` block with:

```tsx
<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption">
  {hasUrl ? (
    <a
      href={result.externalUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-ink font-medium hover:text-ink-2"
    >
      {isOngoing ? (
        <>
          <Radio size={14} /> Live scoreboard
        </>
      ) : (
        <>View full results</>
      )}
      <ArrowUpRight size={14} />
    </a>
  ) : hasPendingUrl ? (
    <a
      href={result.pendingUrl!}
      target="_blank"
      rel="noopener noreferrer"
      title="Candidate results page — awaiting confirmation"
      className="inline-flex items-center gap-1 text-ink-3 font-medium hover:text-ink"
    >
      Results <ArrowUpRight size={14} />
    </a>
  ) : (
    <a
      href={googleSearchUrl(result.title)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-ink-3 font-medium hover:text-ink"
    >
      <Search size={14} /> Search results
    </a>
  )}

  {hasNoticeBoard ? (
    <a
      href={result.noticeBoardUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
    >
      Notice board <ArrowUpRight size={14} />
    </a>
  ) : null}

  {hasPressRecaps ? (
    <Link
      href={`/events/${result.slug}#press`}
      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
    >
      Press recaps →
    </Link>
  ) : result.slug ? (
    <Link
      href={`/events/${result.slug}`}
      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
    >
      Read the diary →
    </Link>
  ) : null}
</div>
```

- [ ] **Step 6.6: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/cards/ResultCard.tsx
git commit -m "feat(ui): ongoing variant for ResultCard with live/notice/press links"
```

---

## Task 7: `ResultsFilter` renders ongoing above the grid

**Files:**
- Modify: `src/components/sections/ResultsFilter.tsx`

- [ ] **Step 7.1: Accept an `ongoing` prop and render it**

In `src/components/sections/ResultsFilter.tsx`, modify the component signature and add an ongoing block before the year tabs:

```tsx
export function ResultsFilter({
  results,
  ongoing = [],
}: {
  results: Result[];
  ongoing?: Result[];
}) {
  // ...existing useMemo blocks unchanged

  return (
    <>
      {ongoing.length > 0 ? (
        <div className="mb-12">
          <h2 className="font-display text-h2 text-ink mb-6">Racing now</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ongoing.map((r) => (
              <ResultCard key={r.id} result={r} />
            ))}
          </div>
        </div>
      ) : null}

      {/* existing tabs + grid unchanged */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {/* ... */}
      </div>
      {/* ...rest unchanged */}
    </>
  );
}
```

- [ ] **Step 7.2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/sections/ResultsFilter.tsx
git commit -m "feat(results): render ongoing cards above the year-filtered grid"
```

---

## Task 8: Wire ongoing data into `/results` page

**Files:**
- Modify: `src/app/results/page.tsx`

- [ ] **Step 8.1: Load and pass ongoing data**

In `src/app/results/page.tsx`, change the imports and the data load:

```tsx
import { deriveResultStats, getResults } from "@/lib/results";
import { getOngoingResults } from "@/lib/ongoing";
```

Inside `ResultsPage`:

```tsx
export default async function ResultsPage() {
  const [results, ongoing] = await Promise.all([
    getResults().catch(() => []),
    getOngoingResults().catch(() => []),
  ]);
  const stats = deriveResultStats(results);
  // ...
}
```

Pass `ongoing` to the filter:

```tsx
<ResultsFilter results={results} ongoing={ongoing} />
```

- [ ] **Step 8.2: Type-check, manual sanity**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run dev` and visit `/results`.
Expected: page renders unchanged (no ongoing data yet, so `ongoing` is `[]`).

- [ ] **Step 8.3: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat(results): load ongoing regattas alongside past results"
```

---

## Task 9: "Racing now" section on home page

**Files:**
- Create: `src/components/sections/RacingNowSection.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 9.1: Create the section component**

```tsx
// src/components/sections/RacingNowSection.tsx
import { Container } from "@/components/ui/Container";
import { ResultCard } from "@/components/cards/ResultCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Result } from "@/lib/results";

export function RacingNowSection({ ongoing }: { ongoing: Result[] }) {
  if (ongoing.length === 0) return null;
  return (
    <section className="py-section-y bg-fog border-b border-mist">
      <Container width="wide">
        <h2 className="font-display text-h1 text-ink mb-8">Racing now</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {ongoing.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i * 0.06, 0.18)}>
              <ResultCard result={r} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 9.2: Wire into the home page**

In `src/app/page.tsx`, add the import near the other section imports:

```tsx
import { RacingNowSection } from "@/components/sections/RacingNowSection";
import { getOngoingResults } from "@/lib/ongoing";
```

In the data-loading block (near where `getResults()` is awaited), add to the `Promise.all`:

```tsx
// before:  const [posts, events, ...] = await Promise.all([...])
// add getOngoingResults() to the list and destructure as `ongoing`.
const ongoing = await getOngoingResults().catch(() => []);
```

Render `<RacingNowSection ongoing={ongoing} />` immediately after the hero block and before the "Next up" section. Locate the existing `coachaibleNextUp` rendering (`src/app/page.tsx:128` area) — place `<RacingNowSection>` directly above the section that renders the next-up card.

- [ ] **Step 9.3: Type-check, sanity-check**

```bash
npx tsc --noEmit
npm run dev
```

Visit `/`. Expected: page renders unchanged (section is null with empty ongoing).

- [ ] **Step 9.4: Commit**

```bash
git add src/components/sections/RacingNowSection.tsx src/app/page.tsx
git commit -m "feat(home): racing-now section under hero, hidden when empty"
```

---

## Task 10: Press section on the event detail page

**Files:**
- Modify: `src/app/events/[slug]/page.tsx`

- [ ] **Step 10.1: Read the existing event page to find the insertion point**

```bash
sed -n '1,60p' src/app/events/\[slug\]/page.tsx
```

- [ ] **Step 10.2: Add the press section**

Near the top of the page file, import:

```ts
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getPressForEvent } from "@/lib/press";
```

Inside the page component (after the event is loaded), fetch the press list:

```ts
const press = await getPressForEvent({
  title: event.title,
  startDate: event.eventDate,
  endDate: event.endDate ?? event.eventDate,
}).catch(() => []);
```

Render the section at the bottom of the page body, before any donate CTA:

```tsx
{press.length > 0 ? (
  <section id="press" className="py-section-y bg-fog border-t border-mist">
    <Container width="default">
      <h2 className="font-display text-h2 text-ink mb-8">Press recaps</h2>
      <ul className="flex flex-col divide-y divide-mist">
        {press.map((p) => (
          <li key={p.externalUrl} className="py-6 first:pt-0 last:pb-0">
            <a
              href={p.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid md:grid-cols-12 gap-4 items-start"
            >
              <div className="md:col-span-3">
                <Badge>{p.publication}</Badge>
                <p className="mt-2 text-caption text-ink-3">
                  {new Date(p.publishedAt).toISOString().slice(0, 10)}
                </p>
              </div>
              <div className="md:col-span-8">
                <h3 className="font-display text-h3 text-ink group-hover:text-ink-2 transition-colors">
                  {p.articleTitle}
                </h3>
                {p.excerpt ? (
                  <p className="mt-2 text-body text-ink/75 max-w-prose">
                    {p.excerpt}
                  </p>
                ) : null}
              </div>
              <span className="md:col-span-1 inline-flex items-center justify-end text-ink-3 group-hover:text-ink">
                <ExternalLink size={18} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Container>
  </section>
) : null}
```

- [ ] **Step 10.3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/events/\[slug\]/page.tsx
git commit -m "feat(events): press recaps section on event detail page"
```

---

## Task 11: Online Notice Board derivation helper

**Files:**
- Create: `src/lib/scrape/onb.ts`
- Create: `tests/scrape/onb.test.ts`

- [ ] **Step 11.1: Write failing test**

```ts
// tests/scrape/onb.test.ts
import { describe, expect, it } from "vitest";
import { deriveNoticeBoardUrl, findNoticeBoardAnchor } from "../../src/lib/scrape/onb";

describe("deriveNoticeBoardUrl — per-source rules", () => {
  it("manage2sail: swaps Result.aspx for Documents.aspx", () => {
    const out = deriveNoticeBoardUrl(
      "https://www.manage2sail.com/en-US/event/abc#!/Result.aspx?id=42",
    );
    expect(out).toContain("Documents");
  });

  it("returns null for unknown hosts", () => {
    expect(deriveNoticeBoardUrl("https://random-site.example/results")).toBeNull();
  });
});

describe("findNoticeBoardAnchor — anchor-text heuristic", () => {
  it("matches links labelled 'Notice Board'", () => {
    const html = `<a href="/onb">Notice Board</a><a href="/results">Results</a>`;
    expect(findNoticeBoardAnchor(html, "https://x.example")).toBe("https://x.example/onb");
  });
  it("matches links with onb or documents in href", () => {
    const html = `<a href="/documents">Docs</a>`;
    expect(findNoticeBoardAnchor(html, "https://x.example")).toBe("https://x.example/documents");
  });
  it("returns null when nothing matches", () => {
    expect(findNoticeBoardAnchor(`<a href="/x">Y</a>`, "https://x.example")).toBeNull();
  });
});
```

- [ ] **Step 11.2: Run, observe failure**

Run: `npx vitest run tests/scrape/onb.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11.3: Implement**

```ts
// src/lib/scrape/onb.ts
import { JSDOM } from "jsdom";

/**
 * Best-effort per-source derivation: given a resolved live-scoreboard URL,
 * return the URL of the same regatta's Online Notice Board.
 * Returns null when no rule matches — caller falls back to anchor scan.
 */
export function deriveNoticeBoardUrl(resolvedUrl: string): string | null {
  try {
    const u = new URL(resolvedUrl);
    const host = u.host.toLowerCase();
    if (host.endsWith("manage2sail.com")) {
      // M2S routes share the event id; the docs/notices tab is reached by
      // swapping the inner path segment. Be conservative: just replace the
      // Result token, leave query intact.
      const swapped = resolvedUrl.replace(/Result\.aspx/i, "Documents.aspx");
      return swapped !== resolvedUrl ? swapped : null;
    }
    // Add more per-source rules here as we encounter live regattas on them.
    return null;
  } catch {
    return null;
  }
}

const ONB_RX = /notice ?board|^onb$|documents|sailing instructions/i;

/**
 * Crawl-time fallback: parse the given HTML page for an anchor whose visible
 * text or href looks like a notice-board link. Returns absolute URL or null.
 */
export function findNoticeBoardAnchor(
  html: string,
  baseUrl: string,
): string | null {
  const dom = new JSDOM(html);
  const anchors = Array.from(dom.window.document.querySelectorAll("a"));
  for (const a of anchors) {
    const text = (a.textContent ?? "").trim();
    const href = a.getAttribute("href") ?? "";
    if (!href) continue;
    if (ONB_RX.test(text) || ONB_RX.test(href)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}
```

- [ ] **Step 11.4: Run test to verify pass**

Run: `npx vitest run tests/scrape/onb.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 11.5: Commit**

```bash
git add src/lib/scrape/onb.ts tests/scrape/onb.test.ts
git commit -m "feat(scrape): derive or detect Online Notice Board URLs"
```

---

## Task 12: Scraper — `scripts/fetch-ongoing-results.ts`

**Files:**
- Create: `scripts/fetch-ongoing-results.ts`
- Modify: `package.json`

- [ ] **Step 12.1: Add npm script**

In `package.json`, alongside the existing `results:fetch`, add:

```json
"results:fetch-ongoing": "tsx --env-file=.env.local scripts/fetch-ongoing-results.ts",
```

- [ ] **Step 12.2: Write the script**

```ts
// scripts/fetch-ongoing-results.ts
/*
  Live-scoreboard scraper for currently-running regattas.

  Pulls ongoing regattas from src/lib/ongoing, uses src/lib/scrape/discover
  to find a results URL per regatta (cached after first hit), extracts
  position via src/lib/scrape/extract-html, and writes src/data/results-ongoing.json.

  Run:
    npm run results:fetch-ongoing
    npx tsx scripts/fetch-ongoing-results.ts --dry
    npx tsx scripts/fetch-ongoing-results.ts --force-rediscover=sofia-2026
*/

import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getOngoingRegattas, type OngoingScrapedFile, type OngoingScrapedItem } from "../src/lib/ongoing";
import { discoverCandidates } from "../src/lib/scrape/discover";
import { extractFromHtml } from "../src/lib/scrape/extract-html";
import { fetchUrl, bufferToText, isPdf } from "../src/lib/scrape/fetch";
import { deriveNoticeBoardUrl, findNoticeBoardAnchor } from "../src/lib/scrape/onb";
import type { WSEventLite } from "../src/lib/scrape/types";

dotenv.config({ path: ".env.local" });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_FILE = path.join(PROJECT_ROOT, "src", "data", "results-ongoing.json");

const args = {
  dry: process.argv.includes("--dry"),
  forceRediscover: (() => {
    const m = process.argv.find((a) => a.startsWith("--force-rediscover="));
    return m ? m.split("=")[1] : null;
  })(),
};

const FAIL_THRESHOLD = 3;

async function readFile_(): Promise<OngoingScrapedFile> {
  if (!existsSync(DATA_FILE)) return { items: [] };
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<OngoingScrapedFile>;
  return { items: Array.isArray(parsed.items) ? parsed.items : [] };
}

async function writeFile_(file: OngoingScrapedFile) {
  const tmp = DATA_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(file, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

function bootstrapWSEvent(r: {
  title: string;
  startDate: string;
  endDate: string;
}): WSEventLite {
  return {
    worldSailingEventId: "",
    worldSailingRegattaCode: null,
    regattaName: r.title,
    startDate: r.startDate,
    endDate: r.endDate,
    position: null,
    className: "ILCA 7",
    classCode: "ILCA7",
    eventName: r.title,
    regattaWebsite: null,
    sailNumber: null,
  };
}

async function fetchAndExtract(url: string): Promise<{
  position: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  finalUrl: string;
  html: string | null;
} | null> {
  const r = await fetchUrl(url);
  if (!r.ok) return null;
  if (isPdf(r.contentType, r.body)) {
    // PDF extraction not wired into the live path yet — skip; the past-results
    // pipeline has a separate PDF extractor we can plug in later if a live
    // regatta only publishes PDFs.
    return null;
  }
  const html = bufferToText(r.body);
  const e = extractFromHtml(html);
  return {
    position: e.externalPosition,
    totalCompetitors: e.totalCompetitors,
    fleet: e.fleet,
    finalUrl: r.finalUrl,
    html,
  };
}

async function scrapeOne(
  regatta: { slug: string; title: string; startDate: string; endDate: string },
  existing: OngoingScrapedItem | undefined,
): Promise<OngoingScrapedItem> {
  const forceRediscover =
    args.forceRediscover === regatta.slug ||
    (existing?.failedExtractions ?? 0) >= FAIL_THRESHOLD;

  const cachedUrl = !forceRediscover ? existing?.resolvedUrl ?? null : null;

  let resolvedUrl: string | null = cachedUrl;
  let html: string | null = null;
  let extraction: Awaited<ReturnType<typeof fetchAndExtract>> = null;

  if (cachedUrl) {
    extraction = await fetchAndExtract(cachedUrl);
    if (extraction && extraction.position !== null) {
      resolvedUrl = cachedUrl;
      html = extraction.html;
    } else {
      // Cached URL failed — fall through to discovery on next run by
      // bumping the failure counter.
      const failedExtractions = (existing?.failedExtractions ?? 0) + 1;
      return {
        ...(existing ?? {
          slug: regatta.slug,
          title: regatta.title,
          startDate: regatta.startDate,
          endDate: regatta.endDate,
          position: null,
          totalCompetitors: null,
          fleet: null,
          externalUrl: null,
          noticeBoardUrl: null,
          source: null,
          resolvedUrl: cachedUrl,
          resolvedAt: existing?.resolvedAt ?? null,
          failedExtractions: 0,
          scrapedAt: null,
        }),
        failedExtractions,
        scrapedAt: new Date().toISOString(),
      };
    }
  } else {
    // Fresh discovery — runs Brave at most once per regatta.
    const ws = bootstrapWSEvent(regatta);
    const candidates = await discoverCandidates(ws);
    for (const c of candidates) {
      const r = await fetchAndExtract(c.url);
      if (r && r.position !== null) {
        resolvedUrl = r.finalUrl;
        extraction = r;
        html = r.html;
        break;
      }
    }
  }

  if (!extraction || extraction.position === null) {
    return {
      slug: regatta.slug,
      title: regatta.title,
      startDate: regatta.startDate,
      endDate: regatta.endDate,
      position: null,
      totalCompetitors: null,
      fleet: null,
      externalUrl: existing?.externalUrl ?? null,
      noticeBoardUrl: existing?.noticeBoardUrl ?? null,
      source: existing?.source ?? null,
      resolvedUrl: existing?.resolvedUrl ?? null,
      resolvedAt: existing?.resolvedAt ?? null,
      failedExtractions: (existing?.failedExtractions ?? 0) + 1,
      scrapedAt: new Date().toISOString(),
    };
  }

  // Notice board — prefer per-source derivation, fallback to anchor scan.
  let noticeBoardUrl = existing?.noticeBoardUrl ?? null;
  if (!noticeBoardUrl && resolvedUrl) {
    noticeBoardUrl = deriveNoticeBoardUrl(resolvedUrl) ?? (html ? findNoticeBoardAnchor(html, resolvedUrl) : null);
  }

  const host = resolvedUrl ? new URL(resolvedUrl).host : null;
  return {
    slug: regatta.slug,
    title: regatta.title,
    startDate: regatta.startDate,
    endDate: regatta.endDate,
    position: String(extraction.position),
    totalCompetitors: extraction.totalCompetitors,
    fleet: extraction.fleet,
    externalUrl: resolvedUrl,
    noticeBoardUrl,
    source: host,
    resolvedUrl,
    resolvedAt: existing?.resolvedAt ?? new Date().toISOString(),
    failedExtractions: 0,
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const file = await readFile_();
  const existingBySlug = new Map(file.items.map((it) => [it.slug, it]));

  const regattas = await getOngoingRegattas();
  console.log(`[ongoing] ${regattas.length} ongoing regatta(s) detected.`);

  const updated: OngoingScrapedItem[] = [];
  for (const r of regattas) {
    process.stdout.write(`  · ${r.slug}  ${r.title} … `);
    const out = await scrapeOne(r, existingBySlug.get(r.slug));
    if (out.position) console.log(`#${out.position}${out.totalCompetitors ? `/${out.totalCompetitors}` : ""}`);
    else console.log(`no position (fails=${out.failedExtractions})`);
    updated.push(out);
  }

  if (args.dry) {
    console.log(`[ongoing] --dry: would write ${updated.length} items.`);
    return;
  }
  await writeFile_({ items: updated });
  console.log(`[ongoing] wrote ${updated.length} items to ${path.relative(PROJECT_ROOT, DATA_FILE)}`);
}

main().catch((err) => {
  console.error("[ongoing] failed:", err);
  process.exit(1);
});
```

- [ ] **Step 12.3: Dry-run to confirm script wiring**

Run: `npm run results:fetch-ongoing -- --dry`
Expected: prints `0 ongoing regatta(s) detected.` and exits cleanly (assuming none in progress now).

- [ ] **Step 12.4: Commit**

```bash
git add scripts/fetch-ongoing-results.ts package.json
git commit -m "feat(scripts): fetch-ongoing-results scraper with URL caching"
```

---

## Task 13: Railway cron entry

**Files:**
- Modify: `railway.toml`

- [ ] **Step 13.1: Read existing config**

```bash
cat railway.toml
```

- [ ] **Step 13.2: Add cron schedule**

Append a cron block running every 30 minutes:

```toml
[[deploy.crons]]
schedule = "*/30 * * * *"
command = "npm run results:fetch-ongoing"
```

(If `railway.toml` already has a `[[deploy.crons]]` array for `results:fetch`, place this entry immediately below it for grouping.)

- [ ] **Step 13.3: Commit**

```bash
git add railway.toml
git commit -m "chore(cron): run ongoing scraper every 30 minutes"
```

---

## Task 14: End-to-end manual verification

**Files:** (read-only)

- [ ] **Step 14.1: Seed a fake ongoing entry**

Edit `src/data/results-ongoing.json` to add one synthetic entry whose `startDate ≤ today ≤ endDate` and whose `slug` matches a known admin event (or use an existing WS past event slug for the smoke test). Example using today = 2026-05-12:

```json
{
  "items": [
    {
      "slug": "test-live-regatta",
      "title": "Test Live Regatta",
      "startDate": "2026-05-10",
      "endDate": "2026-05-14",
      "position": "7",
      "totalCompetitors": 64,
      "fleet": "ILCA 7 Open",
      "externalUrl": "https://example.com/results",
      "noticeBoardUrl": "https://example.com/notices",
      "source": "example.com",
      "resolvedUrl": "https://example.com/results",
      "resolvedAt": "2026-05-10T08:14:00Z",
      "failedExtractions": 0,
      "scrapedAt": "2026-05-12T14:23:00Z"
    }
  ]
}
```

Add a matching admin event via `/admin` (slug `test-live-regatta`, category Regatta, dates 2026-05-10 → 2026-05-14) — `getOngoingRegattas()` reads from admin DB.

- [ ] **Step 14.2: Launch dev server**

Run: `npm run dev`

Verify:
- [ ] `/` shows the "Racing now" section above "Next up" with a single live card showing position 7/64, green "Ongoing" badge with pulse, and three footer links.
- [ ] `/results` shows the same card in a "Racing now" block above the year tabs.
- [ ] Clicking "Live scoreboard ↗" opens `https://example.com/results` in a new tab.
- [ ] Clicking "Notice board ↗" opens `https://example.com/notices` in a new tab.
- [ ] Clicking "Press recaps →" navigates to `/events/test-live-regatta#press` (section may be empty if no real press matches).

- [ ] **Step 14.3: Reset the test data**

Restore `src/data/results-ongoing.json` to `{ "items": [] }` and delete the test admin event. The card sections collapse to nothing on both pages.

- [ ] **Step 14.4: Final commit (only if reset changes are uncommitted)**

```bash
git status
# If results-ongoing.json was reverted to its empty state, no commit needed.
```

---

## Verification Checklist

- [ ] All unit tests pass: `npx vitest run`
- [ ] Type-check is clean: `npx tsc --noEmit`
- [ ] Lint is clean: `npm run lint`
- [ ] `/` and `/results` render the Racing-now block when JSON has an active entry whose dates wrap today
- [ ] Both pages render with no extra whitespace when JSON is empty
- [ ] `npm run results:fetch-ongoing -- --dry` exits cleanly with no ongoing regatta
- [ ] Three footer links on the ongoing card work (live scoreboard, notice board, press recaps)
- [ ] Event-detail page renders the "Press recaps" section only when matching press exists
