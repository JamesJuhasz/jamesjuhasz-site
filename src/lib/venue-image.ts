/**
 * Two-step destination image lookup:
 *
 * Step 0 — static lookup (venue-lookup.ts): instant, no network.
 * Step 1 — web search: finds the venue for events not in the static table.
 *           Requires BRAVE_SEARCH_API_KEY (free at api.search.brave.com, 2k/month).
 *           Searches: ILCA 7 "{title}" {month} {year}
 * Step 2 — Wikipedia image: fetches a photo for the resolved venue / city.
 *
 * Results cached 24 h via Next.js data cache.
 */

import type { ConsolidatedEvent } from "./coachaible";
import { lookupVenue } from "./venue-lookup";

// ── Wikipedia image ───────────────────────────────────────────────────────────

type WikiPageImagesResponse = {
  query: {
    pages: Record<
      string,
      { title: string; thumbnail?: { source: string } }
    >;
  };
};

async function fetchWikipediaImage(wikiTitle: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: wikiTitle,
      prop: "pageimages",
      format: "json",
      pithumbsize: "800",
      redirects: "1",
      origin: "*",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as WikiPageImagesResponse;
    const page = Object.values(data?.query?.pages ?? {})[0];
    return page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// ── Venue extractor ───────────────────────────────────────────────────────────

type VenueHint = {
  club: string;      // e.g. "Royal St. George Yacht Club"
  location: string;  // just the place name, e.g. "Royal St. George" or city if found
};

const KNOWN_CITIES_RE =
  /\b(Dublin|Dún Laoghaire|Dun Laoghaire|Hyères|Palma|Kiel|Miami|Long Beach|Melbourne|Sydney|Perth|Auckland|Helsinki|Medemblik|Weymouth|Cascais|Athens|Enoshima|Kingston|Halifax|Vancouver|Barcelona|Marseille|La Rochelle|Genoa|Valletta|Mar del Plata|Buenos Aires|Bermuda|Hamilton|Tallinn|Aarhus|Gdańsk|Gdansk|Gdynia|Carnac|Medulin|Pula|Trogir|Split|Corpus Christi|Mussanah|Oman|Vilamoura|Scheveningen|Riva del Garda|Riva|Palamos|Palamós|Sandringham|Lymington|Portland|Weymouth|Fremantle|Torquay|Geelong|Hobart|Fortaleza|Recife|Salvador|Rio de Janeiro|São Paulo|Sao Paulo|Florianópolis|Florianopolis|Kingston upon Hull)\b/gi;

/**
 * Pull the most-frequently-mentioned sailing venue name AND any recognisable city
 * out of a block of Brave Search result text.
 */
function extractVenueFromText(text: string): VenueHint | null {
  const decoded = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  const VENUE_RE =
    /\b([A-Z][a-zA-Z]+(?:[\s-][A-Z][a-zA-Z]+){0,4})\s+(Yacht Club|Sailing Club|Yachting Club|Sailing Centre|Sailing Center|Boat Club)\b/g;

  const freq: Record<string, number> = {};
  for (const m of decoded.matchAll(VENUE_RE)) {
    const key = m[0].trim();
    freq[key] = (freq[key] ?? 0) + 1;
  }

  const CITY_DISPLAY: Record<string, string> = {
    "Dun Laoghaire": "Dún Laoghaire",
    "Hyeres": "Hyères",
    "Palamos": "Palamós",
    "Gdansk": "Gdańsk",
    "Florianopolis": "Florianópolis",
    "Sao Paulo": "São Paulo",
  };

  // Look for a known city name (works even when no explicit club is mentioned)
  const cityMatches = [...decoded.matchAll(KNOWN_CITIES_RE)];
  const cityFreq: Record<string, number> = {};
  for (const m of cityMatches) {
    const c = CITY_DISPLAY[m[0]] ?? m[0];
    cityFreq[c] = (cityFreq[c] ?? 0) + 1;
  }
  const topCity = Object.entries(cityFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

  const clubEntries = Object.entries(freq);
  if (clubEntries.length === 0) {
    // No club found — use city alone if we have one
    if (!topCity) return null;
    return { club: topCity, location: topCity };
  }

  const club = clubEntries.sort((a, b) => b[1] - a[1])[0][0];
  const placeName = club
    .replace(/\s+(Yacht Club|Sailing Club|Yachting Club|Sailing Centre|Sailing Center|Boat Club)$/i, "")
    .trim();

  return { club, location: topCity ?? placeName };
}

// ── Step 1: Brave Search → venue name ─────────────────────────────────────────

type BraveResult = { title: string; description?: string };
type BraveResponse = { web?: { results?: BraveResult[] } };

/**
 * Uses the Brave Search API (BRAVE_SEARCH_API_KEY env var) to find what
 * venue/city an ILCA event is hosted at. Falls back to null if no key is set
 * or if no venue can be extracted from the results.
 */
async function findVenueFromWebSearch(
  title: string,
  startDate: string,
): Promise<VenueHint | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const year = startDate.slice(0, 4);
  const month = new Date(`${startDate}T00:00:00`).toLocaleString("en-US", {
    month: "long",
  });
  const query = `ILCA 7 Men's World Championship "${title}" ${month} ${year}`;

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as BraveResponse;

    const text =
      data.web?.results
        ?.map((r) => `${r.title} ${r.description ?? ""}`)
        .join(" ") ?? "";

    return extractVenueFromText(text);
  } catch {
    return null;
  }
}

// ── Step 2: venue name → Wikipedia image ──────────────────────────────────────

/** PNG images from Wikipedia are almost always logos/flags/burgees — skip them. */
function isPhoto(url: string): boolean {
  return !/\.png(\?|$)/i.test(url);
}

async function imageForVenueHint(hint: VenueHint): Promise<string | null> {
  // 1. Try the extracted city/location (best destination photo)
  if (hint.location) {
    const img = await fetchWikipediaImage(hint.location);
    if (img && isPhoto(img)) return img;
  }

  // 2. Try the full club name (accept only real photos, not logos)
  let img = await fetchWikipediaImage(hint.club);
  if (img && isPhoto(img)) return img;

  // 3. Wikipedia opensearch on the club name
  try {
    const params = new URLSearchParams({
      action: "opensearch",
      search: hint.club,
      limit: "3",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const [, results] = (await res.json()) as [string, string[]];
    for (const t of results.slice(0, 3)) {
      img = await fetchWikipediaImage(t);
      if (img && isPhoto(img)) return img;
    }
  } catch {
    // ignore
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

type DestinationInfo = { imageUrl: string | null; city: string | null };

async function getDestinationInfo(
  event: ConsolidatedEvent,
): Promise<DestinationInfo> {
  // Step 0: static lookup (covers most known sailing venues)
  const knownVenue = lookupVenue(event.title, event.startDate);
  if (knownVenue) {
    const img = await fetchWikipediaImage(knownVenue.wikiTitle);
    return {
      imageUrl: img && isPhoto(img) ? img : null,
      city: knownVenue.city,
    };
  }

  // Step 1: web search → venue name  (needs BRAVE_SEARCH_API_KEY)
  const venueHint = await findVenueFromWebSearch(event.title, event.startDate);
  if (!venueHint) return { imageUrl: null, city: null };

  // Step 2: Wikipedia image for the resolved venue
  const imageUrl = await imageForVenueHint(venueHint);
  return { imageUrl, city: venueHint.location };
}

export type EnrichedEvent = ConsolidatedEvent & {
  destinationImageUrl: string | null;
  city: string | null;
};

export async function enrichEventsWithImages(
  events: ConsolidatedEvent[],
): Promise<EnrichedEvent[]> {
  const infos = await Promise.all(events.map(getDestinationInfo));
  return events.map((e, i) => ({
    ...e,
    destinationImageUrl: infos[i].imageUrl,
    city: infos[i].city,
  }));
}
