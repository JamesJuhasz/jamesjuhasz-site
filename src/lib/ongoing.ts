import type { SeedEvent } from "@/lib/seed-data";
import { fetchUpcoming, consolidateEvents, type ConsolidatedEvent } from "@/lib/coachaible";
import { getWorldSailingPastEvents } from "@/lib/world-sailing";

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
