import type { SeedEvent } from "@/lib/seed-data";
import { fetchUpcoming, consolidateEvents, type ConsolidatedEvent } from "@/lib/coachaible";
import { getWorldSailingPastEvents } from "@/lib/world-sailing";
import type { Result } from "@/lib/results";
import scrapedOngoing from "@/data/results-ongoing.json";

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
      slug: e.id,
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
      status: "upcoming" as const,
      excerpt: "",
      coverImage: r.coverImageUrl
        ? { asset: { url: r.coverImageUrl }, alt: r.coverImageAlt ?? undefined }
        : undefined,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ongoing] admin event load failed:", err);
    }
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
    const totalDays = daysInclusive(r.startDate, r.endDate);
    const elapsed = daysInclusive(r.startDate, today);
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
        current: Math.min(elapsed, totalDays),
        total: totalDays,
      },
      lastUpdated: s?.scrapedAt ?? undefined,
      noticeBoardUrl: s?.noticeBoardUrl ?? undefined,
    };
  });
}

export async function getOngoingResults(today?: string): Promise<Result[]> {
  const t = today ?? todayIso();
  const regattas = await getOngoingRegattas(t);
  return buildOngoingResults(regattas, scrapedOngoing as OngoingScrapedFile, t);
}
