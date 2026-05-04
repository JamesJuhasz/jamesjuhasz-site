import {
  consolidateEvents,
  fetchTrainingStats,
  type ConsolidatedEvent,
} from "@/lib/coachaible";
import { getEventsIndex } from "@/sanity/fetch";
import { seedResults, type SeedEvent, type SeedResult } from "@/lib/seed-data";
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

function findSanityOverlay(
  event: ConsolidatedEvent,
  sanity: SeedEvent[],
): SeedEvent | undefined {
  const evNorm = normalizeTitle(event.title);
  return sanity.find((s) => {
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

function fromSeedResult(r: SeedResult): Result {
  return {
    id: r.id,
    title: r.title,
    startDate: r.startDate,
    endDate: r.endDate,
    country: r.country,
    position: r.position,
    totalCompetitors: r.totalCompetitors,
    fleet: r.fleet,
    externalUrl: r.externalUrl,
    source: r.source,
    coverImage: r.coverImage
      ? { url: r.coverImage.asset.url, alt: r.coverImage.alt }
      : undefined,
    excerpt: r.excerpt,
    slug: r.slug,
    location: r.location,
  };
}

function fromSanityOnly(event: SeedEvent): Result {
  return {
    id: `sanity-${event.slug}`,
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

export async function getResults(): Promise<Result[]> {
  // Curated seed results are the authoritative race log. They include verified
  // 2026 placements and clearly-flagged guesses for older entries.
  if (seedResults.length > 0) {
    return seedResults
      .map(fromSeedResult)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }

  const [statsApi, sanityEvents] = await Promise.all([
    fetchTrainingStats(STATS_WINDOW_DAYS),
    getEventsIndex(),
  ]);

  const auto = resultsAuto as ResultsAutoFile;
  const scrapedById = new Map<string, ScrapedResult>(
    auto.items.map((it) => [it.coachaibleId, it]),
  );

  const sanityPast = sanityEvents.filter((e) => e.status !== "upcoming");

  if (!statsApi) {
    return sanityPast
      .map(fromSanityOnly)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const pastRaces = consolidateEvents(
    statsApi.events.filter(
      (e) => e.eventType === "race" && e.startDate < todayIso,
    ),
  );

  const usedSanitySlugs = new Set<string>();
  const results: Result[] = pastRaces.map((event) => {
    const overlay = findSanityOverlay(event, sanityPast);
    if (overlay) usedSanitySlugs.add(overlay.slug);
    return fromConsolidated(event, scrapedById.get(event.id), overlay);
  });

  for (const ev of sanityPast) {
    if (usedSanitySlugs.has(ev.slug)) continue;
    results.push(fromSanityOnly(ev));
  }

  return results.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
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
