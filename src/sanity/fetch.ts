/*
  Sanity fetch wrapper with automatic seed-data fallback.

  When NEXT_PUBLIC_SANITY_PROJECT_ID is unset, callers get the same shape
  back from local seed-data. This means the site stays runnable through
  Days 2-4 (no Sanity yet) and Day 5 only gates the publish flow, not
  the dev experience.
*/

import { sanityClient } from "./client";
import { isSanityConfigured } from "./env";
import {
  recentPosts,
  pressEntries,
  givingLevels,
  type SeedPost,
  type SeedEvent,
  type SeedPress,
  type GivingLevel,
} from "@/lib/seed-data";
import { getWorldSailingPastEvents } from "@/lib/world-sailing";
import pressAuto from "@/data/press-auto.json";
import { SITE } from "@/lib/site";
import {
  POSTS_INDEX,
  POST_BY_SLUG,
  FEATURED_POSTS,
  EVENTS_INDEX,
  EVENT_BY_SLUG,
  PRESS_MENTIONS,
  SUPPORTERS,
  GIVING_LEVELS,
} from "./queries";

const REVALIDATE_SECONDS = 60;

async function fetchOrFallback<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
): Promise<T> {
  if (!isSanityConfigured() || !sanityClient) {
    return fallback;
  }
  try {
    return (await sanityClient.fetch<T>(query, params, {
      next: { revalidate: REVALIDATE_SECONDS },
    })) ?? fallback;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sanity] fetch failed, using fallback:", err);
    }
    return fallback;
  }
}

export type FetchedPost = SeedPost & {
  body?: unknown;
  previous?: { slug: string; title: string };
  next?: { slug: string; title: string };
};

export type FetchedEvent = SeedEvent & {
  body?: unknown;
  upcoming?: boolean;
};

export async function getPostsIndex(): Promise<SeedPost[]> {
  return fetchOrFallback<SeedPost[]>(POSTS_INDEX, {}, recentPosts);
}

export async function getPostBySlug(slug: string): Promise<FetchedPost | null> {
  const fallback = recentPosts.find((p) => p.slug === slug);
  return fetchOrFallback<FetchedPost | null>(
    POST_BY_SLUG,
    { slug },
    fallback ?? null,
  );
}

export async function getFeaturedPosts(): Promise<SeedPost[]> {
  return fetchOrFallback<SeedPost[]>(FEATURED_POSTS, {}, recentPosts.slice(0, 3));
}

export async function getEventsIndex(): Promise<SeedEvent[]> {
  // Fallback is verified World Sailing data. Upcoming events come from
  // CoachAible at the page level — the WS feed is past-only.
  return fetchOrFallback<SeedEvent[]>(EVENTS_INDEX, {}, getWorldSailingPastEvents());
}

export async function getEventBySlug(slug: string): Promise<FetchedEvent | null> {
  const fallback = getWorldSailingPastEvents().find((e) => e.slug === slug);
  return fetchOrFallback<FetchedEvent | null>(
    EVENT_BY_SLUG,
    { slug },
    fallback ?? null,
  );
}

export async function getPressMentions(): Promise<SeedPress[]> {
  const manual = await fetchOrFallback<SeedPress[]>(
    PRESS_MENTIONS,
    {},
    pressEntries,
  );
  const auto = (pressAuto.items ?? []) as SeedPress[];
  const map = new Map<string, SeedPress>();
  for (const entry of auto) map.set(entry.externalUrl, entry);
  for (const entry of manual) map.set(entry.externalUrl, entry);
  return Array.from(map.values()).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  );
}

export async function getSupporters() {
  return fetchOrFallback<typeof SITE.supporters | { name: string; websiteUrl?: string }[]>(
    SUPPORTERS,
    {},
    SITE.supporters,
  );
}

export async function getGivingLevels(): Promise<GivingLevel[]> {
  return fetchOrFallback<GivingLevel[]>(GIVING_LEVELS, {}, givingLevels);
}
