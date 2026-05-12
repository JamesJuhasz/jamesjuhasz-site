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
  const from = shiftDate(event.startDate, -45);
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
