/*
  Sanity fetch wrappers for the entities still hosted in Sanity:
  press mentions, supporters, giving levels.

  Newsletters and events have moved to Postgres — see src/lib/posts.ts
  and src/lib/events.ts. Falls back to seed-data when Sanity isn't
  configured so the site keeps rendering in dev.
*/

import { sanityClient } from "./client";
import { isSanityConfigured } from "./env";
import {
  pressEntries,
  givingLevels,
  type SeedPress,
  type GivingLevel,
} from "@/lib/seed-data";
import pressAuto from "@/data/press-auto.json";
import { SITE } from "@/lib/site";
import { PRESS_MENTIONS, SUPPORTERS, GIVING_LEVELS } from "./queries";

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
