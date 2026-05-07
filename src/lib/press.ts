/*
  Press mentions read-side. Sources: hardcoded `pressEntries` (curated) and
  `pressAuto` (auto-scraped JSON snapshot). Manual entries take precedence on
  externalUrl collision.
*/

import { pressEntries, type SeedPress } from "@/lib/seed-data";
import pressAuto from "@/data/press-auto.json";

export async function getPressMentions(): Promise<SeedPress[]> {
  const auto = (pressAuto.items ?? []) as SeedPress[];
  const map = new Map<string, SeedPress>();
  for (const entry of auto) map.set(entry.externalUrl, entry);
  for (const entry of pressEntries) map.set(entry.externalUrl, entry);
  return Array.from(map.values()).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  );
}
