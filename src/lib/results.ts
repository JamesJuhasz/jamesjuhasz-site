import {
  consolidateEvents,
  fetchTrainingStats,
  type ConsolidatedEvent,
} from "@/lib/coachaible";
import { getEventsIndex } from "@/lib/events";
import { type SeedEvent } from "@/lib/seed-data";
import { getWorldSailingResults } from "@/lib/world-sailing";
import resultsAuto from "@/data/results-auto.json";

export type ScrapedResult = {
  coachaibleId: string;
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
  externalUrl: string | null;
  source: string | null;
  scrapedAt: string | null;
};

export type ResultsAutoFile = {
  items: ScrapedResult[];
  denylist: string[];
};

export type Result = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  country: string | null;
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
  externalUrl: string | null;
  source: string | null;
  coverImage?: { url: string; alt?: string };
  excerpt?: string;
  slug?: string;
  location?: string;
  /** Candidate results URL awaiting human review — not yet confirmed accurate. */
  pendingUrl?: string | null;
};

const STATS_WINDOW_DAYS = 730;

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

function daysApart(a: string, b: string): number {
  const aMs = new Date(`${a}T00:00:00Z`).getTime();
  const bMs = new Date(`${b}T00:00:00Z`).getTime();
  return Math.abs(Math.round((bMs - aMs) / 86_400_000));
}

function findOverlay(
  event: ConsolidatedEvent,
  overlays: SeedEvent[],
): SeedEvent | undefined {
  const evNorm = normalizeTitle(event.title);
  return overlays.find((s) => {
    if (normalizeTitle(s.title) !== evNorm) return false;
    return daysApart(s.eventDate, event.startDate) <= 7;
  });
}

function fromConsolidated(
  event: ConsolidatedEvent,
  scraped: ScrapedResult | undefined,
  overlay: SeedEvent | undefined,
): Result {
  const manualPosition = overlay?.resultPosition?.trim() || null;
  return {
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    country: event.country,
    position: manualPosition ?? scraped?.position ?? null,
    totalCompetitors: scraped?.totalCompetitors ?? null,
    fleet: scraped?.fleet ?? null,
    externalUrl: scraped?.externalUrl ?? null,
    source: scraped?.source ?? null,
    coverImage: overlay?.coverImage
      ? {
          url: overlay.coverImage.asset.url,
          alt: overlay.coverImage.alt,
        }
      : undefined,
    excerpt: overlay?.excerpt,
    slug: overlay?.slug,
    location: overlay?.location,
  };
}

function fromOverlayOnly(event: SeedEvent): Result {
  return {
    id: `db-${event.slug}`,
    title: event.title,
    startDate: event.eventDate,
    endDate: event.endDate ?? event.eventDate,
    country: null,
    position: event.resultPosition?.trim() || null,
    totalCompetitors: null,
    fleet: null,
    externalUrl: null,
    source: null,
    coverImage: event.coverImage
      ? { url: event.coverImage.asset.url, alt: event.coverImage.alt }
      : undefined,
    excerpt: event.excerpt,
    slug: event.slug,
    location: event.location,
  };
}

function applyOverrides(
  base: Result[],
  overrides: Map<string, { position: string | null; totalCompetitors: number | null; fleet: string | null; externalUrl: string | null; hidden: boolean }>,
): Result[] {
  return base
    .map((r) => {
      const o = overrides.get(r.id);
      if (!o) return r;
      if (o.hidden) return null;
      return {
        ...r,
        position: o.position ?? r.position,
        totalCompetitors: o.totalCompetitors ?? r.totalCompetitors,
        fleet: o.fleet ?? r.fleet,
        externalUrl: o.externalUrl ?? r.externalUrl,
      };
    })
    .filter((r): r is Result => r !== null);
}

async function loadOverrides(): Promise<
  Map<
    string,
    {
      position: string | null;
      totalCompetitors: number | null;
      fleet: string | null;
      externalUrl: string | null;
      hidden: boolean;
    }
  >
> {
  if (!process.env.DATABASE_URL) return new Map();
  try {
    const { listOverrides } = await import("@/lib/admin/store/results");
    const rows = await listOverrides();
    return new Map(
      rows.map((r) => [
        r.coachaibleId,
        {
          position: r.position,
          totalCompetitors: r.totalCompetitors,
          fleet: r.fleet,
          externalUrl: r.externalUrl,
          hidden: r.hidden,
        },
      ]),
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[results] override load failed:", err);
    }
    return new Map();
  }
}

export async function getResults(): Promise<Result[]> {
  const overrides = await loadOverrides();

  // World Sailing is the authoritative source for past regatta results.
  // The fixture under src/data/world-sailing-events.json is regenerated from
  // the federation profile by scripts/fetch-world-sailing.ts.
  const wsResults = getWorldSailingResults();
  if (wsResults.length > 0) {
    return applyOverrides(wsResults, overrides);
  }

  const [statsApi, dbEvents] = await Promise.all([
    fetchTrainingStats(STATS_WINDOW_DAYS),
    getEventsIndex(),
  ]);

  const auto = resultsAuto as ResultsAutoFile;
  const scrapedById = new Map<string, ScrapedResult>(
    auto.items.map((it) => [it.coachaibleId, it]),
  );

  const dbPast = dbEvents.filter((e) => e.status !== "upcoming");

  if (!statsApi) {
    return dbPast
      .map(fromOverlayOnly)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const pastRaces = consolidateEvents(
    statsApi.events.filter(
      (e) => e.eventType === "race" && e.startDate < todayIso,
    ),
  );

  const usedOverlaySlugs = new Set<string>();
  const results: Result[] = pastRaces.map((event) => {
    const overlay = findOverlay(event, dbPast);
    if (overlay) usedOverlaySlugs.add(overlay.slug);
    return fromConsolidated(event, scrapedById.get(event.id), overlay);
  });

  for (const ev of dbPast) {
    if (usedOverlaySlugs.has(ev.slug)) continue;
    results.push(fromOverlayOnly(ev));
  }

  return applyOverrides(
    results.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    overrides,
  );
}

export function deriveResultStats(results: Result[]): {
  total: number;
  podiums: number;
  topTens: number;
  countries: number;
} {
  let podiums = 0;
  let topTens = 0;
  const countries = new Set<string>();
  for (const r of results) {
    if (r.country) countries.add(r.country);
    const n = parsePosition(r.position);
    if (n !== null) {
      if (n <= 3) podiums++;
      if (n <= 10) topTens++;
    }
  }
  return {
    total: results.length,
    podiums,
    topTens,
    countries: countries.size,
  };
}

export function parsePosition(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
