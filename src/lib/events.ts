/*
  Public read-side for events. Returns a SeedEvent-compatible shape.

  Sources, in priority order (last wins on slug collision):
  1. World Sailing past events (auto-scraped fixtures)
  2. Admin-created events from Postgres (manual entries via /admin)

  Coachaible upcoming events are still fetched at the page level — they're
  high-churn and benefit from request-time freshness rather than indexing
  here.
*/

import type { SeedEvent } from "@/lib/seed-data";
import { getWorldSailingPastEvents } from "@/lib/world-sailing";

function isUpcoming(eventDate: string): boolean {
  return new Date(eventDate) >= new Date(new Date().toISOString().slice(0, 10));
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
      resultPosition: r.resultPosition ?? undefined,
      status: r.upcoming || isUpcoming(r.eventDate) ? "upcoming" : "past",
      excerpt: r.bodyHtml ? r.bodyHtml.replace(/<[^>]+>/g, "").slice(0, 200) : "",
      coverImage: r.coverImageUrl
        ? {
            asset: { url: r.coverImageUrl },
            alt: r.coverImageAlt ?? undefined,
          }
        : undefined,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[events] admin event load failed:", err);
    }
    return [];
  }
}

export type FetchedEvent = SeedEvent & {
  bodyHtml?: string | null;
  body?: unknown;
  upcoming?: boolean;
};

export async function getEventBySlug(
  slug: string,
): Promise<FetchedEvent | null> {
  // Prefer admin event by slug; fall back to WS past event.
  if (process.env.DATABASE_URL) {
    try {
      const { getEventBySlug: dbGet } = await import("@/lib/admin/store/events");
      const r = await dbGet(slug);
      if (r) {
        return {
          slug: r.slug,
          title: r.title,
          eventDate: r.eventDate,
          endDate: r.endDate ?? undefined,
          location: r.location,
          category: r.category as "Regatta" | "Training" | "Coaching",
          resultPosition: r.resultPosition ?? undefined,
          status: r.upcoming || isUpcoming(r.eventDate) ? "upcoming" : "past",
          excerpt: "",
          coverImage: r.coverImageUrl
            ? {
                asset: { url: r.coverImageUrl },
                alt: r.coverImageAlt ?? undefined,
              }
            : undefined,
          bodyHtml: r.bodyHtml,
          upcoming: r.upcoming,
        };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[events] admin event slug lookup failed:", err);
      }
    }
  }
  const ws = getWorldSailingPastEvents().find((e) => e.slug === slug);
  return ws ? { ...ws } : null;
}

export async function getEventsIndex(): Promise<SeedEvent[]> {
  const [admin, ws] = await Promise.all([
    loadAdminEvents(),
    Promise.resolve(getWorldSailingPastEvents()),
  ]);
  // Admin entries override WS entries on slug collision.
  const bySlug = new Map<string, SeedEvent>();
  for (const e of ws) bySlug.set(e.slug, e);
  for (const e of admin) bySlug.set(e.slug, e);
  return Array.from(bySlug.values()).sort((a, b) =>
    a.eventDate < b.eventDate ? 1 : -1,
  );
}
