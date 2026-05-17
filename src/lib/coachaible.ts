import { lookupCountry } from "./venue-countries";

export type CoachaibleEventType =
  | "race"
  | "training"
  | "travel"
  | "rest"
  | "other";

export type CoachaibleRawEvent = {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  eventType: CoachaibleEventType;
  racePriority: string | null;
  notes?: string;
};

type WorkoutBucket = {
  count: number;
  distanceKm: number;
  distinctDays: number;
  totalDurationMins: number;
};

export type CoachaibleStatsResponse = {
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  lastWorkoutDate: string | null;
  generatedAt: string;
  workouts: {
    byType: {
      bike: WorkoutBucket;
      run: WorkoutBucket;
      strength: WorkoutBucket;
      other: WorkoutBucket;
    };
    totalCount: number;
    totalDistinctDays: number;
  };
  events: CoachaibleRawEvent[];
};

export type CoachaibleUpcomingResponse = {
  events: CoachaibleRawEvent[];
};

export type ConsolidatedEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  eventType: CoachaibleEventType;
  racePriority: string | null;
  country: string | null;
};

export type DerivedStats = {
  trainingDays: number;
  eventsCompleted: number;
  kmCycled: number;
  countriesTraveled: number;
};

const REVALIDATE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 8000;

function getEnv(): { base: string; token: string } | null {
  const base = process.env.COACHAIBLE_API_BASE;
  const token = process.env.COACHAIBLE_API_TOKEN;
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ""), token };
}

async function safeFetch<T>(path: string): Promise<T | null> {
  const env = getEnv();
  if (!env) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.base}${path}`, {
      headers: { Authorization: `Bearer ${env.token}` },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["coachaible"] },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[coachaible] ${path} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[coachaible] ${path} failed:`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchUpcoming(
  limit = 50,
): Promise<CoachaibleUpcomingResponse | null> {
  return safeFetch<CoachaibleUpcomingResponse>(
    `/api/public/calendar/upcoming?limit=${limit}`,
  );
}

export async function fetchTrainingStats(
  days = 365,
): Promise<CoachaibleStatsResponse | null> {
  return safeFetch<CoachaibleStatsResponse>(
    `/api/public/stats/training?days=${days}`,
  );
}

const DISPLAY_TYPES: ReadonlySet<CoachaibleEventType> = new Set([
  "race",
  "training",
]);

const COUNTRY_TYPES: ReadonlySet<CoachaibleEventType> = new Set([
  "race",
  "training",
]);

function dayDiff(a: string, b: string): number {
  const aMs = new Date(`${a}T00:00:00Z`).getTime();
  const bMs = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24));
}

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

// Key that uniquely identifies one *instance* of a recurring trip. Title alone
// collides across instances (e.g. "Training: Bermuda" runs in both May and
// June) and causes an ongoing instance to be deduped against a future one.
export function eventInstanceKey(e: {
  title: string;
  startDate: string;
}): string {
  return `${normalizeTitle(e.title)}|${e.startDate}`;
}

export function consolidateEvents(
  events: CoachaibleRawEvent[],
): ConsolidatedEvent[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const groups: CoachaibleRawEvent[][] = [];
  for (const ev of sorted) {
    const last = groups[groups.length - 1];
    const lastEv = last?.[last.length - 1];
    if (
      lastEv &&
      normalizeTitle(lastEv.title) === normalizeTitle(ev.title) &&
      dayDiff(lastEv.endDate ?? lastEv.startDate, ev.startDate) <= 2
    ) {
      last.push(ev);
    } else {
      groups.push([ev]);
    }
  }

  return groups.map((g) => {
    const first = g[0];
    const last = g[g.length - 1];
    return {
      id: `coachaible-${first.id}`,
      title: first.title,
      startDate: first.startDate,
      endDate: last.endDate ?? last.startDate,
      eventType: first.eventType,
      racePriority: first.racePriority,
      country: lookupCountry(first.title),
    };
  });
}

export function filterDisplayable(
  events: ConsolidatedEvent[],
): ConsolidatedEvent[] {
  return events.filter((e) => DISPLAY_TYPES.has(e.eventType));
}

export function filterOngoing(
  events: ConsolidatedEvent[],
  today: string,
): ConsolidatedEvent[] {
  return events.filter((e) => today >= e.startDate && today <= e.endDate);
}

export function deriveStats(
  stats: CoachaibleStatsResponse,
  now: Date = new Date(),
): DerivedStats {
  const trainingDays = stats.workouts.totalDistinctDays;
  const kmCycled = Math.round(stats.workouts.byType.bike.distanceKm);

  const todayIso = now.toISOString().slice(0, 10);

  const seenRaceTitles = new Set<string>();
  for (const ev of stats.events) {
    if (ev.eventType !== "race") continue;
    if (ev.startDate >= todayIso) continue;
    seenRaceTitles.add(normalizeTitle(ev.title));
  }
  const eventsCompleted = seenRaceTitles.size;

  const countries = new Set<string>();
  for (const ev of stats.events) {
    if (!COUNTRY_TYPES.has(ev.eventType)) continue;
    const c = lookupCountry(ev.title);
    if (c) countries.add(c);
  }
  const countriesTraveled = countries.size;

  return { trainingDays, eventsCompleted, kmCycled, countriesTraveled };
}
