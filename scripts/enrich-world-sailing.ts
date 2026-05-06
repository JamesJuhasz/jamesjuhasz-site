/*
  scripts/enrich-world-sailing.ts
  ---------------------------------------------------------------------------
  Best-effort enrichment of World Sailing event rows with venue, country code,
  fleet size, and a public results URL. Output: src/data/world-sailing-enrichment.json.

  Strategy is layered:
    1. Hardcoded `KNOWN_EVENTS` map — high-confidence venue + class fleet sizes
       for the major events (Trofeo Sofia, ILCA Worlds, CORK, Kieler Woche,
       Princesa Sofia, EurILCA Europeans, etc.). These are sourced from the
       federation press releases and entry archives over the years.
    2. Venue patterns from `src/lib/venue-countries.ts` — derive country from
       the regatta name when no hardcoded entry matches.
    3. ISO 3166-1 alpha-3 lookup — convert country name to code.

  Entries with `_locked: true` are NEVER overwritten — set this flag on hand-
  curated rows in the JSON to protect manual edits across re-runs.

  Run:
    npm run ws:enrich
    npx tsx scripts/enrich-world-sailing.ts --dry
*/

import { JSDOM } from "jsdom";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import { chromium } from "playwright";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const NEWS_FETCH_TIMEOUT_MS = 10_000;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const EXCERPT_MAX = 800;
const IMAGE_DIR = path.join(PROJECT_ROOT, "public", "images", "regattas");
const IMAGE_PUBLIC_BASE = "/images/regattas";
const EVENTS_FILE = path.join(
  PROJECT_ROOT,
  "src",
  "data",
  "world-sailing-events.json",
);
const ENRICH_FILE = path.join(
  PROJECT_ROOT,
  "src",
  "data",
  "world-sailing-enrichment.json",
);

const args = {
  dry: process.argv.includes("--dry"),
  /** Skip the news-scrape pass (fast metadata-only refresh). */
  noNews: process.argv.includes("--no-news"),
  /** Skip the cover-image scrape pass. */
  noImages: process.argv.includes("--no-images"),
  /** Skip the fleet-size-from-results-URL pass. */
  noFleet: process.argv.includes("--no-fleet"),
  /** Re-fetch news even for events that already have a diaryExcerpt. */
  refreshNews: process.argv.includes("--refresh-news"),
  /** Re-fetch cover images even for events that already have one. */
  refreshImages: process.argv.includes("--refresh-images"),
  /** Re-fetch fleet sizes even for events that already have totalCompetitors. */
  refreshFleet: process.argv.includes("--refresh-fleet"),
  /** Use Playwright headless browser for JS-rendered results pages. */
  headless: process.argv.includes("--headless"),
  /** Search for per-day race reports and build a daily diary. */
  daily: process.argv.includes("--daily"),
  /** Limit per-pass fetches to N events (debug). */
  limit: (() => {
    const m = process.argv.find((a) => a.startsWith("--limit="));
    if (!m) return Infinity;
    const n = Number(m.split("=")[1]);
    return Number.isFinite(n) && n > 0 ? n : Infinity;
  })(),
};

type WSEventRow = {
  worldSailingEventId: string;
  worldSailingRegattaCode: string | null;
  regattaName: string;
  startDate: string;
  endDate: string;
  position: number | null;
  className: string;
  classCode: string;
  regattaWebsite: string | null;
};

type WSDump = { events: WSEventRow[] };

type Enrichment = {
  countryCode?: string;
  location?: string;
  totalCompetitors?: number;
  resultsUrl?: string;
  /** 1–2 sentence description pulled from a news source. */
  diaryExcerpt?: string;
  /** Source URL the excerpt came from. */
  diarySourceUrl?: string;
  /** Outlet name, e.g. "Sail-World" or "Google News". */
  diarySourceName?: string;
  /** Local public path of a regatta-relevant image scraped from news. */
  coverImageUrl?: string;
  /** External URL the image came from (for attribution / re-download). */
  coverImageSourceUrl?: string;
  _locked?: boolean;
  notes?: string;
};

type EnrichmentFile = {
  generatedAt?: string | null;
  _format?: string;
  entries: Record<string, Enrichment>;
};

/* ---------------------------------------------------------------------------
   KNOWN map — last-resort fallback only.

   The enrich script runs three automated passes first (regatta-site scrape,
   news article mining, results-URL fetch). The KNOWN map is only applied in
   Pass 4, and only fills fields that all three scraping passes left null.

   STRICT RULE — `totalCompetitors` values here are ILCA 7 (men's class) only
   — never ILCA 6 or a combined-class total. Every entry that sets
   `totalCompetitors` MUST also set `resultsUrl` pointing to the official
   class-specific results page. A hardcoded fleet count without a `resultsUrl`
   is never acceptable: it cannot self-correct and will silently display a
   wrong number. Add `resultsUrl` instead and let Pass 3 derive the count.

   If you need to correct a wrong count: update the enrichment JSON directly
   and set `_locked: true` on that entry — the script will never overwrite it.
-------------------------------------------------------------------------- */
type KnownEvent = {
  match: (row: WSEventRow) => boolean;
  data: Enrichment;
};

const KNOWN: KnownEvent[] = [
  // 2026 — current season
  {
    match: (r) =>
      /Trofeo S\.A\.R Princesa Sofia/i.test(r.regattaName) &&
      r.startDate.startsWith("2026"),
    data: {
      countryCode: "ESP",
      location: "Palma de Mallorca, Spain",
      totalCompetitors: 199,
      resultsUrl: "https://www.trofeoprincesasofia.org/en/default/races/race-resultsall",
    },
  },
  {
    match: (r) =>
      /Semaine Olympique Francaise/i.test(r.regattaName) &&
      r.startDate.startsWith("2026"),
    data: {
      countryCode: "FRA",
      location: "Hyères, France",
      totalCompetitors: 136,
      resultsUrl: "https://sof.ffvoile.fr",
    },
  },
  {
    match: (r) =>
      /Portugal Grand Prix/i.test(r.regattaName) &&
      r.startDate.startsWith("2026"),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },

  // 2025
  {
    match: (r) =>
      /EurILCA Europa Cup - Malta/i.test(r.regattaName) &&
      r.startDate.startsWith("2025"),
    data: { countryCode: "MLT", location: "Marsamxett Harbour, Malta" },
  },
  {
    match: (r) =>
      /Campionato Italiano Classi Olimpiche/i.test(r.regattaName),
    data: { countryCode: "ITA", location: "Palermo, Italy" },
  },
  {
    match: (r) =>
      /EurILCA Senior European Championships/i.test(r.regattaName) &&
      r.startDate.startsWith("2025"),
    // Country + city come from WS code + regatta-site scrape.
    // Fleet size derived from official results via resultsUrl (Pass 3).
    data: { resultsUrl: "https://eurilca.eu/documents/340/results/ilca7.htm" },
  },
  {
    match: (r) =>
      /Long Beach Olympic Classes Regatta/i.test(r.regattaName),
    data: { countryCode: "USA", location: "Long Beach, CA, USA" },
  },
  {
    match: (r) =>
      /Kieler Woche/i.test(r.regattaName) && r.startDate.startsWith("2025"),
    data: {
      countryCode: "DEU",
      location: "Kiel, Germany",
      totalCompetitors: 87,
      resultsUrl: "https://www.kieler-woche.de/en/sailing/",
    },
  },
  {
    match: (r) =>
      /ILCA 6 Women.* ILCA 7 Men.* World Championships/i.test(r.regattaName),
    data: {
      countryCode: "CHN",
      location: "Qingdao, China",
      totalCompetitors: 138,
      resultsUrl: "https://2025ilcaolympic.ilca-worlds.org",
    },
  },
  {
    match: (r) =>
      /Trofeo S\.A\.R Princesa Sofia/i.test(r.regattaName) &&
      r.startDate.startsWith("2025"),
    data: {
      countryCode: "ESP",
      location: "Palma de Mallorca, Spain",
      totalCompetitors: 124,
    },
  },
  {
    match: (r) =>
      /Portugal Grand Prix/i.test(r.regattaName) &&
      r.startDate.startsWith("2025"),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },

  // 2024
  {
    match: (r) =>
      /EurILCA Europa Cup - Malta/i.test(r.regattaName) &&
      r.startDate.startsWith("2024"),
    data: { countryCode: "MLT", location: "Marsamxett Harbour, Malta" },
  },
  {
    match: (r) =>
      /CORK International Regatta|CORK Olympic Classes/i.test(r.regattaName) &&
      r.startDate.startsWith("2024"),
    data: {
      countryCode: "CAN",
      location: "Kingston, ON, Canada",
    },
  },
  {
    match: (r) =>
      /Trofeo S\.A\.R Princesa Sofia.* World Cup Series/i.test(r.regattaName) &&
      r.startDate.startsWith("2024"),
    data: {
      countryCode: "ESP",
      location: "Palma de Mallorca, Spain",
      totalCompetitors: 130,
    },
  },
  {
    match: (r) =>
      /EurILCA Europa Cup - Spain/i.test(r.regattaName),
    data: { countryCode: "ESP", location: "Spain" },
  },
  {
    match: (r) =>
      /ILCA 7 Men's World Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2024"),
    // Country + city now come from WS code + regatta-site scrape.
    data: { totalCompetitors: 130 },
  },

  // 2023
  {
    match: (r) =>
      /Portugal Grand Prix/i.test(r.regattaName) &&
      r.startDate.startsWith("2023"),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },
  {
    match: (r) =>
      /Allianz Sailing World Championships/i.test(r.regattaName),
    data: {
      countryCode: "NLD",
      location: "Scheveningen, The Hague, Netherlands",
      totalCompetitors: 120,
    },
  },
  {
    match: (r) =>
      /US Open Sailing Series.*Long Beach/i.test(r.regattaName),
    data: { countryCode: "USA", location: "Long Beach, CA, USA" },
  },
  {
    match: (r) =>
      /Trofeo S\.A\.R Princesa Sofia.* World Cup Series/i.test(r.regattaName) &&
      r.startDate.startsWith("2023"),
    data: {
      countryCode: "ESP",
      location: "Palma de Mallorca, Spain",
      totalCompetitors: 132,
    },
  },
  {
    match: (r) =>
      /EurILCA Senior European Championships/i.test(r.regattaName) &&
      r.startDate.startsWith("2023"),
    data: {
      countryCode: "GRC",
      location: "Athens, Greece",
      totalCompetitors: 120,
    },
  },

  // 2022
  {
    match: (r) =>
      /Portugal Grand Prix/i.test(r.regattaName) &&
      r.startDate.startsWith("2022"),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },
  {
    match: (r) =>
      /EurILCA Senior European Championships/i.test(r.regattaName) &&
      r.startDate.startsWith("2022"),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },
  {
    match: (r) =>
      /ILCA North American Championship/i.test(r.regattaName),
    data: { countryCode: "USA", location: "Buffalo, NY, USA" },
  },
  {
    match: (r) =>
      /Kieler Woche/i.test(r.regattaName) && r.startDate.startsWith("2022"),
    data: {
      countryCode: "DEU",
      location: "Kiel, Germany",
    },
  },
  {
    match: (r) =>
      /ILCA 7 Men's World Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2022"),
    // Country comes from WS regatta code (MEX); city from scrape.
    data: { totalCompetitors: 154 },
  },
  {
    match: (r) =>
      /Semaine Olympique Francaise/i.test(r.regattaName) &&
      r.startDate.startsWith("2022"),
    data: { countryCode: "FRA", location: "Hyères, France" },
  },
  {
    match: (r) =>
      /Trofeo S\.A\.R Princesa Sofia.* Hempel World Cup/i.test(r.regattaName),
    data: {
      countryCode: "ESP",
      location: "Palma de Mallorca, Spain",
      totalCompetitors: 132,
    },
  },
  {
    match: (r) =>
      /West Marine US Open Sailing Series.*Fort Lauderdale/i.test(r.regattaName),
    data: { countryCode: "USA", location: "Fort Lauderdale, FL, USA" },
  },

  // 2021
  {
    match: (r) =>
      /ILCA 7 Men's World Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2021"),
    data: {
      countryCode: "ESP",
      location: "Barcelona, Spain",
      totalCompetitors: 142,
    },
  },
  {
    match: (r) =>
      /EurILCA Senior European Championships/i.test(r.regattaName) &&
      r.startDate.startsWith("2021"),
    data: { countryCode: "POL", location: "Gdynia, Poland" },
  },
  {
    match: (r) =>
      /Allianz Regatta.*Hempel World Cup/i.test(r.regattaName),
    data: { countryCode: "NLD", location: "Medemblik, Netherlands" },
  },
  {
    match: (r) =>
      /ILCA Vilamoura European Continental Qualification/i.test(r.regattaName),
    data: { countryCode: "PRT", location: "Vilamoura, Portugal" },
  },

  // 2020
  {
    match: (r) =>
      /Laser Senior European Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2020"),
    data: {
      countryCode: "POL",
      location: "Gdynia, Poland",
      totalCompetitors: 99,
    },
  },
  {
    match: (r) =>
      /ILCA Laser Standard Men's World Championship/i.test(r.regattaName),
    data: {
      countryCode: "AUS",
      location: "Melbourne, Australia",
      totalCompetitors: 156,
    },
  },
  {
    match: (r) =>
      /Hempel World Cup Series.*Miami/i.test(r.regattaName) &&
      r.startDate.startsWith("2020"),
    data: { countryCode: "USA", location: "Miami, FL, USA" },
  },

  // 2019
  {
    match: (r) =>
      /Laser Under-21 World Championships/i.test(r.regattaName),
    data: {
      countryCode: "POL",
      location: "Gdynia, Poland",
      totalCompetitors: 105,
    },
  },
  {
    match: (r) =>
      /CORK OCR/i.test(r.regattaName) && r.startDate.startsWith("2019"),
    data: {
      countryCode: "CAN",
      location: "Kingston, ON, Canada",
    },
  },
  {
    match: (r) =>
      /Laser North American Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2019"),
    data: { countryCode: "USA", location: "Wickford, RI, USA" },
  },
  {
    match: (r) =>
      /Kieler Woche/i.test(r.regattaName) && r.startDate.startsWith("2019"),
    data: { countryCode: "DEU", location: "Kiel, Germany" },
  },
  {
    match: (r) =>
      /Laser Senior European Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2019"),
    data: {
      countryCode: "PRT",
      location: "Porto, Portugal",
      totalCompetitors: 152,
    },
  },
  {
    match: (r) =>
      /Hempel World Cup Series.*Miami/i.test(r.regattaName) &&
      r.startDate.startsWith("2019"),
    data: { countryCode: "USA", location: "Miami, FL, USA" },
  },

  // 2018
  {
    match: (r) =>
      /CORK Fall Regatta/i.test(r.regattaName),
    data: { countryCode: "CAN", location: "Kingston, ON, Canada" },
  },
  {
    match: (r) =>
      /CORK OCR/i.test(r.regattaName) && r.startDate.startsWith("2018"),
    data: { countryCode: "CAN", location: "Kingston, ON, Canada" },
  },
  {
    match: (r) =>
      /Kieler Woche/i.test(r.regattaName) && r.startDate.startsWith("2018"),
    data: { countryCode: "DEU", location: "Kiel, Germany" },
  },
  {
    match: (r) =>
      /Laser Midwinters East/i.test(r.regattaName) &&
      r.startDate.startsWith("2018"),
    data: { countryCode: "USA", location: "Clearwater, FL, USA" },
  },

  // 2017
  {
    match: (r) =>
      /Cork OCR/i.test(r.regattaName) && r.startDate.startsWith("2017"),
    data: { countryCode: "CAN", location: "Kingston, ON, Canada" },
  },
  {
    match: (r) =>
      /Laser Canadian Championships/i.test(r.regattaName),
    data: { countryCode: "CAN", location: "Hubbards, NS, Canada" },
  },
  {
    match: (r) =>
      /Laser North American Championship/i.test(r.regattaName) &&
      r.startDate.startsWith("2017"),
    data: { countryCode: "USA", location: "Buffalo, NY, USA" },
  },
  {
    match: (r) =>
      /Laser Midwinters East/i.test(r.regattaName) &&
      r.startDate.startsWith("2017"),
    data: { countryCode: "USA", location: "Clearwater, FL, USA" },
  },

  // 2016
  {
    match: (r) =>
      /Cork OCR/i.test(r.regattaName) && r.startDate.startsWith("2016"),
    data: { countryCode: "CAN", location: "Kingston, ON, Canada" },
  },
];

/* ---------------------------------------------------------------------------
   Tier 2: country-name → ISO 3166-1 alpha-3 lookup. Used when only the
   pattern-matched country name is available (no full venue).
-------------------------------------------------------------------------- */
const ALPHA3: Record<string, string> = {
  Canada: "CAN",
  Spain: "ESP",
  France: "FRA",
  Germany: "DEU",
  Italy: "ITA",
  Finland: "FIN",
  Netherlands: "NLD",
  UK: "GBR",
  Portugal: "PRT",
  USA: "USA",
  Greece: "GRC",
  Australia: "AUS",
  "New Zealand": "NZL",
  Japan: "JPN",
  Malta: "MLT",
  Argentina: "ARG",
  Poland: "POL",
  Mexico: "MEX",
  China: "CHN",
};

/* ---------------------------------------------------------------------------
   Brave Search API — direct article URLs, no redirect decoding required.
-------------------------------------------------------------------------- */
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY ?? "";

type BraveWebResult = {
  url: string;
  title: string;
  description?: string;
};

async function braveSearch(query: string, count = 8): Promise<BraveWebResult[]> {
  if (!BRAVE_API_KEY) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NEWS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: BraveWebResult[] };
    };
    return data.web?.results ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------------------
   Article body + racing content extraction.
-------------------------------------------------------------------------- */

const RACING_TERMS = [
  "wind", "knot", "breeze", "gust", "shift", "wave", "swell",
  "race", "fleet", "mark", "upwind", "downwind", "reach", "tack",
  "gybe", "start", "finish", "regatta", "ilca", "laser",
  "medal", "series", "points", "leg", "course", "boat speed",
  "condition", "sailing", "sailor", "championship",
];

/** Extract visible paragraph text from raw HTML, stripping chrome/nav/scripts. */
function extractArticleBody(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const paragraphs: string[] = [];
  for (const m of stripped.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(m[1]).trim();
    if (text.length >= 50) paragraphs.push(text);
  }
  return paragraphs.join(" ").slice(0, 15_000);
}

/**
 * From a block of text, pick sentences that mention racing, conditions, or
 * fleet activity. Returns null if not enough sailing content is found.
 */
function pickRacingContent(text: string, maxChars: number): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (!RACING_TERMS.some((kw) => lower.includes(kw))) return null;

  const sentences = text.split(/(?<=[.!?])\s+/);
  const relevant = sentences.filter((s) => {
    const sl = s.toLowerCase();
    return RACING_TERMS.some((kw) => sl.includes(kw));
  });
  if (relevant.length < 2) return null;

  let diary = "";
  for (const s of relevant) {
    if (diary.length + s.length + 1 > maxChars) break;
    diary += (diary ? " " : "") + s;
  }
  return diary.trim() || null;
}

/** Days between two ISO date strings (inclusive). */
function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/* ---------------------------------------------------------------------------
   News scraping — Google News RSS + light HTML clean-up.
   For each event, we search "<regatta name> <year> ILCA" and pick the most
   relevant article description as the diary excerpt.
-------------------------------------------------------------------------- */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function newsQueryFor(row: WSEventRow): string {
  const cleanName = row.regattaName
    .replace(/\s+\/\s+.*$/, "") // drop "/ World Cup Series" suffix
    .replace(/\(Olympic Classes Regatta\)/i, "")
    .trim();
  const year = row.startDate.slice(0, 4);
  return `"${cleanName}" ${year} ILCA`;
}

function googleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

type RssItem = {
  title: string;
  link: string;
  description: string;
  source: string;
};

async function fetchRss(url: string): Promise<RssItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NEWS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const dom = new JSDOM(xml, { contentType: "text/xml" });
    const items = Array.from(dom.window.document.querySelectorAll("item")) as Element[];
    return items.map((node) => ({
      title: node.querySelector("title")?.textContent ?? "",
      link: node.querySelector("link")?.textContent ?? "",
      description: node.querySelector("description")?.textContent ?? "",
      source: node.querySelector("source")?.textContent ?? "",
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function pickBestArticle(
  items: RssItem[],
  row: WSEventRow,
): RssItem | null {
  if (items.length === 0) return null;
  const year = row.startDate.slice(0, 4);
  const tokens = row.regattaName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3);

  const scored = items
    .map((item) => {
      const haystack = `${item.title} ${item.description}`.toLowerCase();
      // Hard requirement: the article must reference this event's year.
      // Otherwise we risk attaching a 2023 article to a 2025 event.
      if (!haystack.includes(year)) return { item, score: -1 };
      let score = 0;
      if (/ilca\s*7|laser\s+standard|men/.test(haystack)) score += 1;
      for (const t of tokens) if (haystack.includes(t)) score += 1;
      if (item.source.toLowerCase().includes("ilca")) score += 2;
      if (item.source.toLowerCase().includes("world sailing")) score += 2;
      if (item.source.toLowerCase().includes("scuttlebutt")) score += 1;
      return { item, score };
    })
    .filter((s) => s.score >= 0);
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 3) return null;
  return top.item;
}

/* ---------------------------------------------------------------------------
   Image scraping. We extract og:image from the article HTML, then download
   the bytes locally so cards survive publisher link-rot and don't need
   domain whitelisting in next.config.
-------------------------------------------------------------------------- */
function absoluteUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

// Best-effort decode of Google News RSS article URLs. The path format is
// /rss/articles/<base64-protobuf>?oc=5 — decoding usually exposes the publisher
// URL as a UTF-8 substring inside the protobuf payload.
function decodeGoogleNewsUrl(url: string): string | null {
  const m = url.match(/\/articles\/([^?\/]+)/);
  if (!m) return null;
  try {
    let encoded = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (encoded.length % 4) encoded += "=";
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const urlMatch = decoded.match(/https?:\/\/[^\s\x00-\x1f"<>]+/);
    if (!urlMatch) return null;
    const candidate = urlMatch[0];
    if (candidate.includes("news.google.com")) return null;
    return candidate;
  } catch {
    return null;
  }
}

function extractOgImage(html: string, baseUrl: string): string | null {
  const candidates = [
    /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m?.[1]) {
      const url = decodeEntities(m[1]).trim();
      if (!url) continue;
      // Skip tracking pixels, sprite sheets, and tiny fallbacks.
      if (/\.(svg)(?:$|\?)/i.test(url)) continue;
      return absoluteUrl(url, baseUrl);
    }
  }
  return null;
}

function inferImageExtension(url: string, contentType: string | null): string {
  const fromCt = (contentType || "").toLowerCase();
  if (fromCt.includes("jpeg") || fromCt.includes("jpg")) return ".jpg";
  if (fromCt.includes("png")) return ".png";
  if (fromCt.includes("webp")) return ".webp";
  if (fromCt.includes("avif")) return ".avif";
  if (fromCt.includes("gif")) return ".gif";
  const m = url.toLowerCase().match(/\.(jpe?g|png|webp|avif|gif)(?:$|\?|#)/);
  if (m) return "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  return ".jpg";
}

async function downloadImage(
  url: string,
  destBasename: string,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "image/*,*/*;q=0.8" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    if (ct && !ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Reject suspiciously small images (1×1 trackers, generic sprites).
    if (buf.byteLength < 4_000) return null;
    const ext = inferImageExtension(url, ct);
    await mkdir(IMAGE_DIR, { recursive: true });
    const filename = `${destBasename}${ext}`;
    const filePath = path.join(IMAGE_DIR, filename);
    await writeFile(filePath, buf);
    return `${IMAGE_PUBLIC_BASE}/${filename}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare host like `2024ilca7men.ilca-worlds.org` — assume https.
  return `https://${trimmed}`;
}

async function fetchHtml(rawUrl: string): Promise<{
  finalUrl: string;
  html: string;
} | null> {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NEWS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const finalUrl = res.url || url;
    if (finalUrl.includes("news.google.com")) return null;
    return { finalUrl, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a country code from the regatta-site URL when one is encoded as a
 *  path or subdomain segment (e.g. `final-results-2025-eurilca-europa-cup-mlt/`
 *  → MLT). Returns null when no ISO3 segment is found. */
function countryFromUrl(rawUrl: string): string | null {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const segments = [
    ...parsed.hostname.split("."),
    ...parsed.pathname.split("/").filter(Boolean),
    ...parsed.pathname.split(/[^a-z0-9]+/i).filter(Boolean),
  ];
  for (const raw of segments) {
    const candidate = raw.toUpperCase();
    if (candidate.length === 3 && KNOWN_ALPHA3.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function fetchArticleAssets(
  rssLink: string,
): Promise<{ publisherUrl: string; html: string } | null> {
  // Google News links for our query format are tokenized — the protobuf
  // payload no longer contains a plain URL. Decode is best-effort; if it
  // fails the news fetch will return null and we fall back to the regatta
  // site image (which is anyway the more authoritative source).
  const decoded = decodeGoogleNewsUrl(rssLink);
  const targets = decoded ? [decoded, rssLink] : [rssLink];
  for (const url of targets) {
    const got = await fetchHtml(url);
    if (got) return { publisherUrl: got.finalUrl, html: got.html };
  }
  return null;
}

/* ---------------------------------------------------------------------------
   Regatta-site scrape — pulls (a) the venue (city + ISO country) from the
   site's title/meta/page text, and (b) the og:image as a regatta-relevant
   cover. Both come from a single HTML fetch.

   Venue is extracted by matching the page text against a curated table of
   ILCA-circuit cities. The first match wins. The hardcoded KNOWN map only
   acts as a fallback when no city pattern hits.
-------------------------------------------------------------------------- */
type CityPattern = {
  /** Regex matched against page text. */
  re: RegExp;
  /** Display city, e.g. "Palma de Mallorca, Spain". */
  location: string;
  /** ISO 3166-1 alpha-3 code. */
  countryCode: string;
};

const CITY_PATTERNS: CityPattern[] = [
  // Sweden
  { re: /\bMarstrand\b/i, location: "Marstrand, Sweden", countryCode: "SWE" },
  { re: /\bGothenburg\b/i, location: "Gothenburg, Sweden", countryCode: "SWE" },
  { re: /\bGöteborg\b/i, location: "Gothenburg, Sweden", countryCode: "SWE" },
  { re: /\bStockholm\b/i, location: "Stockholm, Sweden", countryCode: "SWE" },
  // Spain
  { re: /\bPalma de Mallorca\b/i, location: "Palma de Mallorca, Spain", countryCode: "ESP" },
  { re: /\bMallorca\b/i, location: "Palma de Mallorca, Spain", countryCode: "ESP" },
  { re: /\bPalma\b/i, location: "Palma de Mallorca, Spain", countryCode: "ESP" },
  { re: /\bBarcelona\b/i, location: "Barcelona, Spain", countryCode: "ESP" },
  { re: /\bC[áa]diz\b/i, location: "Cádiz, Spain", countryCode: "ESP" },
  // France
  { re: /\bHy[èeé]res\b/i, location: "Hyères, France", countryCode: "FRA" },
  { re: /\bMarseille\b/i, location: "Marseille, France", countryCode: "FRA" },
  // Germany
  { re: /\bKiel\b/i, location: "Kiel, Germany", countryCode: "DEU" },
  { re: /\bWarnem[uü]nde\b/i, location: "Warnemünde, Germany", countryCode: "DEU" },
  // Italy
  { re: /\bGarda\b/i, location: "Lake Garda, Italy", countryCode: "ITA" },
  { re: /\bPalermo\b/i, location: "Palermo, Italy", countryCode: "ITA" },
  { re: /\bGenoa\b/i, location: "Genoa, Italy", countryCode: "ITA" },
  { re: /\bGenova\b/i, location: "Genoa, Italy", countryCode: "ITA" },
  { re: /\bRiva\b/i, location: "Riva del Garda, Italy", countryCode: "ITA" },
  // Netherlands
  { re: /\bMedemblik\b/i, location: "Medemblik, Netherlands", countryCode: "NLD" },
  { re: /\bScheveningen\b/i, location: "Scheveningen, Netherlands", countryCode: "NLD" },
  { re: /\bThe Hague\b/i, location: "The Hague, Netherlands", countryCode: "NLD" },
  // Portugal
  { re: /\bVilamoura\b/i, location: "Vilamoura, Portugal", countryCode: "PRT" },
  { re: /\bCascais\b/i, location: "Cascais, Portugal", countryCode: "PRT" },
  { re: /\bLagos\b/i, location: "Lagos, Portugal", countryCode: "PRT" },
  { re: /\bPorto\b/i, location: "Porto, Portugal", countryCode: "PRT" },
  // Poland
  { re: /\bGdynia\b/i, location: "Gdynia, Poland", countryCode: "POL" },
  { re: /\bGda[nń]sk\b/i, location: "Gdańsk, Poland", countryCode: "POL" },
  // Greece
  { re: /\bAthens\b/i, location: "Athens, Greece", countryCode: "GRC" },
  { re: /\bThessaloniki\b/i, location: "Thessaloniki, Greece", countryCode: "GRC" },
  { re: /\bPatras\b/i, location: "Patras, Greece", countryCode: "GRC" },
  // Australia
  { re: /\bMelbourne\b/i, location: "Melbourne, Australia", countryCode: "AUS" },
  { re: /\bAdelaide\b/i, location: "Adelaide, Australia", countryCode: "AUS" },
  { re: /\bSydney\b/i, location: "Sydney, Australia", countryCode: "AUS" },
  { re: /\bPerth\b/i, location: "Perth, Australia", countryCode: "AUS" },
  // China
  { re: /\bQingdao\b/i, location: "Qingdao, China", countryCode: "CHN" },
  // Argentina
  { re: /\bMar del Plata\b/i, location: "Mar del Plata, Argentina", countryCode: "ARG" },
  { re: /\bBuenos Aires\b/i, location: "Buenos Aires, Argentina", countryCode: "ARG" },
  // Mexico
  { re: /\bPuerto Vallarta\b/i, location: "Puerto Vallarta, Mexico", countryCode: "MEX" },
  { re: /\bRiviera Nayarit\b/i, location: "Riviera Nayarit, Mexico", countryCode: "MEX" },
  { re: /\bVallarta\b/i, location: "Puerto Vallarta, Mexico", countryCode: "MEX" },
  // Generic country fallback (must come last in their region) — only fires
  // when no city pattern hit. Useful for sites that mention only the country.
  { re: /\bMexico\b/i, location: "Mexico", countryCode: "MEX" },
  // USA
  { re: /\bMiami\b/i, location: "Miami, FL, USA", countryCode: "USA" },
  { re: /\bCoconut Grove\b/i, location: "Coconut Grove, FL, USA", countryCode: "USA" },
  { re: /\bFort Lauderdale\b/i, location: "Fort Lauderdale, FL, USA", countryCode: "USA" },
  { re: /\bLong Beach\b/i, location: "Long Beach, CA, USA", countryCode: "USA" },
  { re: /\bClearwater\b/i, location: "Clearwater, FL, USA", countryCode: "USA" },
  { re: /\bWickford\b/i, location: "Wickford, RI, USA", countryCode: "USA" },
  { re: /\bNewport\b/i, location: "Newport, RI, USA", countryCode: "USA" },
  { re: /\bHouston\b/i, location: "Houston, TX, USA", countryCode: "USA" },
  { re: /\bBuffalo\b/i, location: "Buffalo, NY, USA", countryCode: "USA" },
  // Canada
  { re: /\bKingston\b/i, location: "Kingston, ON, Canada", countryCode: "CAN" },
  { re: /\bHubbards\b/i, location: "Hubbards, NS, Canada", countryCode: "CAN" },
  { re: /\bToronto\b/i, location: "Toronto, ON, Canada", countryCode: "CAN" },
  { re: /\bMontreal\b/i, location: "Montreal, QC, Canada", countryCode: "CAN" },
  { re: /\bHalifax\b/i, location: "Halifax, NS, Canada", countryCode: "CAN" },
  // Malta
  { re: /\bMarsamxett\b/i, location: "Marsamxett Harbour, Malta", countryCode: "MLT" },
  { re: /\bMalta\b/i, location: "Marsamxett Harbour, Malta", countryCode: "MLT" },
];

/** Set of ISO 3166-1 alpha-3 country codes that appear as the prefix of
 *  World Sailing regatta codes (e.g. MLT202412GKP → MLT). */
const KNOWN_ALPHA3 = new Set([
  "AUS", "ARG", "AUT", "BEL", "BRA", "CAN", "CHN", "CYP", "CZE", "DEU",
  "DNK", "ESP", "EST", "FIN", "FRA", "GBR", "GRC", "HRV", "HUN", "IRL",
  "ISL", "ISR", "ITA", "JPN", "KOR", "LTU", "LVA", "MEX", "MLT", "NLD",
  "NOR", "NZL", "POL", "PRT", "ROU", "SGP", "SVK", "SVN", "SWE", "TUR",
  "URY", "USA",
]);

/** Pick a city from page text, preferring matches consistent with the
 *  expected country (when known). Avoids the eurilca.org → Marstrand
 *  cross-talk where a hub page mentions multiple events at different venues. */
function pickVenueFromText(
  text: string,
  expectedCountry: string | null,
): { location: string; countryCode: string } | null {
  const haystack = text.replace(/\s+/g, " ");
  for (const p of CITY_PATTERNS) {
    if (!p.re.test(haystack)) continue;
    if (!expectedCountry) {
      return { location: p.location, countryCode: p.countryCode };
    }
    if (p.countryCode === expectedCountry) {
      return { location: p.location, countryCode: p.countryCode };
    }
    // Pattern matched but country doesn't agree with the WS-assigned host
    // country — keep scanning for a country-consistent match before giving
    // up. Fall through to KNOWN map if nothing fits.
  }
  return null;
}

function extractRegattaText(html: string): string {
  // Pull title, og meta, and visible body text — the hosting venue is almost
  // always mentioned in at least one of these.
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const ogTitle =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";
  const ogDesc =
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";
  const ogSite =
    html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";
  const metaDesc =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";
  // Strip script/style/nav before looking at body text — those contain
  // unrelated location references (e.g. footer site-wide links).
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  const visible = stripHtml(body).slice(0, 8000);
  return decodeEntities(`${title} ${ogTitle} ${ogDesc} ${ogSite} ${metaDesc} ${visible}`);
}

/** Fetch the regatta's official website and extract venue + cover image.
 *  When `expectedCountry` is known (from the WS regatta code), city matches
 *  are filtered to that country so cross-event hub pages can't bleed in
 *  the wrong location. */
async function fetchRegattaSiteAssets(
  row: WSEventRow,
  expectedCountry: string | null,
): Promise<{
  venue?: { location: string; countryCode: string };
  cover?: { localPath: string; sourceUrl: string };
} | null> {
  if (!row.regattaWebsite) return null;
  const normalized = normalizeUrl(row.regattaWebsite);
  if (!normalized) return null;
  let url: URL;
  try { url = new URL(normalized); } catch { return null; }
  // Reject obviously generic class-association hub URLs (eurilca.org/, etc.)
  // — they describe many events and routinely cross-bleed venues.
  const isHub =
    /^(eurilca|ilcasailing)\.\w+$/i.test(url.hostname.replace(/^www\./, "")) &&
    (url.pathname === "/" || url.pathname === "");
  if (isHub) return null;

  const got = await fetchHtml(row.regattaWebsite);
  if (!got) return null;
  const venue =
    pickVenueFromText(extractRegattaText(got.html), expectedCountry) ??
    undefined;
  let cover: { localPath: string; sourceUrl: string } | undefined;
  const ogImg = extractOgImage(got.html, got.finalUrl);
  if (ogImg) {
    const local = await downloadImage(ogImg, row.worldSailingEventId);
    if (local) cover = { localPath: local, sourceUrl: ogImg };
  }
  if (!venue && !cover) return null;
  return { venue, cover };
}

type DiaryFinding = {
  excerpt: string;
  url: string;
  source: string;
  /** Local public path of the downloaded cover image, if any. */
  coverImagePublicPath?: string;
  /** External URL the image came from. */
  coverImageSourceUrl?: string;
  /** ILCA 7 fleet size mined from the article text. */
  fleetSize?: number;
};

/**
 * Orchestrator: try Brave Search first (direct URLs, richer article bodies),
 * with optional per-day breakdown for multi-day events (--daily flag).
 * Falls back to Google News RSS when Brave finds nothing.
 */
async function fetchDiaryExcerpt(
  row: WSEventRow,
): Promise<DiaryFinding | null> {
  const year = row.startDate.slice(0, 4);
  const cleanName = row.regattaName
    .replace(/\s+\/\s+.*$/, "")
    .replace(/\(Olympic Classes Regatta\)/i, "")
    .trim();

  // Per-day breakdown pass (--daily + multi-day event + Brave key available).
  if (args.daily && BRAVE_API_KEY && daysBetween(row.startDate, row.endDate) >= 3) {
    const daily = await fetchDailyDiary(row, cleanName, year);
    if (daily) {
      return {
        excerpt: daily,
        url: `https://search.brave.com/search?q=${encodeURIComponent(`"${cleanName}" ${year}`)}`,
        source: "Multiple sources (Brave Search)",
      };
    }
  }

  // Primary: Brave Search → article body → racing content.
  if (BRAVE_API_KEY) {
    const braveResult = await fetchDiaryViaBrave(row, cleanName, year);
    if (braveResult) return braveResult;
  }

  // Fallback: Google News RSS.
  return fetchDiaryViaGoogleNews(row);
}

/** Brave Search → fetch full article body → extract racing/conditions paragraphs. */
async function fetchDiaryViaBrave(
  row: WSEventRow,
  cleanName: string,
  year: string,
): Promise<DiaryFinding | null> {
  const queries = [
    `"${cleanName}" ${year} ILCA 7 race conditions report`,
    `"${cleanName}" ${year} sailing race day results`,
    `${cleanName} ${year} ILCA regatta`,
  ];

  for (const query of queries) {
    const results = await braveSearch(query, 8);
    if (results.length === 0) continue;

    // Prefer sailing-focused outlets, keeping order stable via dedup.
    const sailingFirst = [
      ...results.filter((r) => {
        const u = r.url.toLowerCase();
        const t = (r.title ?? "").toLowerCase();
        return (
          u.includes("ilca") || u.includes("sail-world") || u.includes("eurilca") ||
          u.includes("worldsailing") || u.includes("scuttlebutt") ||
          t.includes("ilca") || t.includes("regatta") || t.includes("race")
        );
      }),
      ...results,
    ].filter((r, i, arr) => arr.findIndex((x) => x.url === r.url) === i);

    for (const candidate of sailingFirst.slice(0, 4)) {
      const meta = `${candidate.title} ${candidate.description ?? ""}`;
      if (!meta.includes(year)) continue;

      const got = await fetchHtml(candidate.url);
      if (!got) continue;

      // Full article body → racing paragraphs (preferred path).
      const bodyText = extractArticleBody(got.html);
      const racingContent = pickRacingContent(bodyText, EXCERPT_MAX);
      if (racingContent && racingContent.length >= 80) {
        let coverImagePublicPath: string | undefined;
        let coverImageSourceUrl: string | undefined;
        const ogImg = extractOgImage(got.html, got.finalUrl);
        if (ogImg) {
          const local = await downloadImage(ogImg, row.worldSailingEventId);
          if (local) { coverImagePublicPath = local; coverImageSourceUrl = ogImg; }
        }
        const fleetSize = extractFleetSizeFromText(bodyText, row.position)?.size;
        let sourceName: string;
        try { sourceName = new URL(got.finalUrl).hostname.replace(/^www\./, ""); }
        catch { sourceName = "Brave Search"; }
        return { excerpt: racingContent, url: got.finalUrl, source: sourceName, coverImagePublicPath, coverImageSourceUrl, fleetSize };
      }

      // og:description fallback when body extraction is insufficient.
      const desc = extractOgDescription(got.html);
      if (desc && desc.length >= 80) {
        let coverImagePublicPath: string | undefined;
        let coverImageSourceUrl: string | undefined;
        const ogImg = extractOgImage(got.html, got.finalUrl);
        if (ogImg) {
          const local = await downloadImage(ogImg, row.worldSailingEventId);
          if (local) { coverImagePublicPath = local; coverImageSourceUrl = ogImg; }
        }
        let sourceName: string;
        try { sourceName = new URL(got.finalUrl).hostname.replace(/^www\./, ""); }
        catch { sourceName = "Brave Search"; }
        return { excerpt: truncate(desc, EXCERPT_MAX), url: got.finalUrl, source: sourceName, coverImagePublicPath, coverImageSourceUrl };
      }

      await new Promise((r) => setTimeout(r, 400));
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/** Compile per-day race reports via Brave Search (used with --daily flag). */
async function fetchDailyDiary(
  row: WSEventRow,
  cleanName: string,
  year: string,
): Promise<string | null> {
  const totalDays = daysBetween(row.startDate, row.endDate);
  const maxDays = Math.min(totalDays, 6);
  const dayEntries: string[] = [];

  for (let day = 1; day <= maxDays; day++) {
    const query = `"${cleanName}" ${year} "day ${day}" ILCA racing conditions`;
    const results = await braveSearch(query, 5);

    const dayResult = results.find((r) => {
      const text = `${r.title} ${r.description ?? ""}`.toLowerCase();
      return text.includes(`day ${day}`) && text.includes(year);
    });
    if (!dayResult) continue;

    const got = await fetchHtml(dayResult.url);
    if (!got) continue;

    const bodyText = extractArticleBody(got.html);
    const racing = pickRacingContent(bodyText, 220);
    if (racing) dayEntries.push(`Day ${day}: ${racing}`);

    await new Promise((r) => setTimeout(r, 500));
  }

  return dayEntries.length >= 2 ? dayEntries.join("\n\n") : null;
}

/**
 * Google News RSS fallback. Also tries full article body extraction before
 * falling back to og:description or raw RSS snippet.
 */
async function fetchDiaryViaGoogleNews(
  row: WSEventRow,
): Promise<DiaryFinding | null> {
  const items = await fetchRss(googleNewsRssUrl(newsQueryFor(row)));
  const best = pickBestArticle(items, row);
  if (!best) return null;

  const article = await fetchArticleAssets(best.link);

  let excerpt: string | null = null;
  let excerptUrl = best.link;

  if (article) {
    // Full body → racing content (preferred).
    const bodyText = extractArticleBody(article.html);
    const racingContent = pickRacingContent(bodyText, EXCERPT_MAX);
    if (racingContent && racingContent.length >= 80) {
      excerpt = racingContent;
      excerptUrl = article.publisherUrl;
    }
    // og:description fallback.
    if (!excerpt) {
      const desc = extractOgDescription(article.html);
      if (desc) {
        excerpt = truncate(desc, EXCERPT_MAX);
        excerptUrl = article.publisherUrl;
      }
    }
  }
  if (!excerpt) {
    let text = stripHtml(best.description);
    if (best.source) {
      text = text.replace(new RegExp(`\\s+${escapeRegex(best.source)}$`, "i"), "");
    }
    text = text.replace(/\s+-\s+$/, "").trim();
    if (text.length >= 40) excerpt = truncate(text, EXCERPT_MAX);
  }
  if (!excerpt) return null;

  let coverImagePublicPath: string | undefined;
  let coverImageSourceUrl: string | undefined;
  if (article) {
    const ogImg = extractOgImage(article.html, article.publisherUrl);
    if (ogImg) {
      const local = await downloadImage(ogImg, row.worldSailingEventId);
      if (local) { coverImagePublicPath = local; coverImageSourceUrl = ogImg; }
    }
  }

  let fleetSize: number | undefined;
  const articleText = article ? stripHtml(article.html) : "";
  const rssText = stripHtml(best.description ?? "");
  const mined = extractFleetSizeFromText(`${articleText} ${rssText}`, row.position);
  if (mined) fleetSize = mined.size;

  return { excerpt, url: excerptUrl, source: best.source || "Google News", coverImagePublicPath, coverImageSourceUrl, fleetSize };
}

function extractOgDescription(html: string): string | null {
  const candidates = [
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (!m) continue;
    const d = decodeEntities(m[1]).trim();
    if (d.length < 40) continue;
    if (
      /comprehensive,?\s+up-to-date news coverage/i.test(d) ||
      /aggregated from sources all over the world/i.test(d)
    )
      continue;
    return d;
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract an ILCA 7 fleet size from free text (news articles, results pages).
 *
 * Priority:
 *  1. If we know the sailor's position, look for "Nth of N" / "Nth out of N" —
 *     high-confidence because it's the exact placement sentence.
 *  2. Generic fleet-size patterns: "N boats", "N entries", "N starters",
 *     "N competitors", "field of N", "N ILCA 7", "N sailors" near ILCA 7 context.
 *
 * Returns `{ size, confident }` or null when nothing plausible is found.
 * `confident: true` when extracted from a known-position pattern.
 */
function extractFleetSizeFromText(
  text: string,
  position?: number | null,
): { size: number; confident: boolean } | null {
  const clean = text.replace(/\s+/g, " ");

  // Layer 1 — position anchor: "37th of 136", "37th out of 136", "37 of 136"
  if (position != null && position > 0) {
    const posRe = new RegExp(
      `\\b${position}(?:st|nd|rd|th)?\\s+(?:of|out of|from)\\s+(\\d{2,3})\\b`,
      "gi",
    );
    for (const m of clean.matchAll(posRe)) {
      const n = Number(m[1]);
      if (n > position && n <= 500) return { size: n, confident: true };
    }
    // Also "finished Nth in a fleet of N" / "placed Nth among N"
    const fleetPosRe = new RegExp(
      `\\b${position}(?:st|nd|rd|th)?\\b.{0,60}\\bfleet\\s+of\\s+(\\d{2,3})\\b`,
      "gi",
    );
    for (const m of clean.matchAll(fleetPosRe)) {
      const n = Number(m[1]);
      if (n > position && n <= 500) return { size: n, confident: true };
    }
  }

  // Layer 2 — ILCA 7 context: "136 ILCA 7 boats", "ILCA 7 fleet of 136"
  const ilca7Patterns = [
    /\b(\d{2,3})\s+ilca\s*7\b/gi,
    /\bilca\s*7\b.{0,40}\bfield\s+of\s+(\d{2,3})\b/gi,
    /\bilca\s*7\b.{0,40}\bfleet\s+of\s+(\d{2,3})\b/gi,
    /\bfleet\s+of\s+(\d{2,3})\b.{0,40}\bilca\s*7\b/gi,
    /\b(\d{2,3})\s+(?:boats?|entries|starters?|competitors?|sailors?)\b.{0,60}\bilca\s*7\b/gi,
    /\bilca\s*7\b.{0,60}\b(\d{2,3})\s+(?:boats?|entries|starters?|competitors?|sailors?)\b/gi,
  ];
  for (const re of ilca7Patterns) {
    for (const m of clean.matchAll(re)) {
      const raw = m[1] ?? m[2];
      const n = Number(raw);
      // Reject if fleet can't accommodate the known position (sanity guard).
      if (position != null && position > 0 && n < position) continue;
      if (n >= 10 && n <= 500) return { size: n, confident: false };
    }
  }

  // Layer 3 — generic fleet context without ILCA 7 qualifier (lower confidence)
  const genericPatterns = [
    /\b(\d{2,3})\s+(?:boats?|entries|starters?|competitors?)\b/gi,
    /\bfield\s+of\s+(\d{2,3})\b/gi,
    /\bfleet\s+of\s+(\d{2,3})\b/gi,
  ];
  const candidates: number[] = [];
  for (const re of genericPatterns) {
    for (const m of clean.matchAll(re)) {
      const n = Number(m[1]);
      // Reject if fleet can't accommodate the known position (sanity guard).
      if (position != null && position > 0 && n < position) continue;
      if (n >= 10 && n <= 500) candidates.push(n);
    }
  }
  if (candidates.length > 0) {
    // Take the most-frequently occurring value, or the largest if tied.
    const freq = new Map<number, number>();
    for (const c of candidates) freq.set(c, (freq.get(c) ?? 0) + 1);
    const best = [...freq.entries()].sort(
      (a, b) => b[1] - a[1] || b[0] - a[0],
    )[0];
    return { size: best[0], confident: false };
  }

  return null;
}

/**
 * Fetch a results URL (or any page) and try to extract the ILCA 7 fleet size.
 *
 * Strategy:
 *  1. Run `extractFleetSizeFromText` on the full page text (og:description +
 *     visible body text stripped of HTML).
 *  2. If that fails, count rows in any table/list section that mentions "ILCA 7"
 *     or "Laser" within 2000 chars, using JSDOM.
 */
async function fetchFleetSizeFromUrl(
  rawUrl: string,
  position?: number | null,
): Promise<{ size: number; confident: boolean } | null> {
  let html: string;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT_MS);
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // Try text-level extraction first (fast, no DOM parsing needed).
  const plainText = stripHtml(html);
  const fromText = extractFleetSizeFromText(plainText, position);
  if (fromText?.confident) return fromText;

  // DOM approach — count rows in an ILCA 7 results table.
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const bodyText = doc.body?.textContent ?? "";
    // Trust URL path as a strong signal (e.g. "…/results/ilca7.htm").
    const urlPath = (() => { try { return new URL(rawUrl).pathname; } catch { return rawUrl; } })();
    const isIlca7Page =
      /ilca.?7/i.test(urlPath) ||
      /ilca\s*7/i.test(bodyText) ||
      /laser/i.test(bodyText);

    if (isIlca7Page) {
      // Count rows that look like competitor entries (have a rank column with a number).
      const tables = Array.from(doc.querySelectorAll("table"));
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll("tr")).filter((tr) => {
          const cells = tr.querySelectorAll("td");
          if (cells.length < 2) return false;
          const firstCellText = cells[0]?.textContent?.trim() ?? "";
          return /^\d+$/.test(firstCellText);
        });
        if (rows.length >= 10 && rows.length <= 500) {
          const tableText = table.textContent ?? "";
          // Skip mixed-class tables.
          if (/ilca\s*6|radial|standard/i.test(tableText)) continue;
          return { size: rows.length, confident: true };
        }
      }

      // Fallback: some results pages use an ordered list instead of a table.
      const lists = Array.from(doc.querySelectorAll("ol"));
      for (const ol of lists) {
        const items = ol.querySelectorAll("li");
        if (items.length >= 10 && items.length <= 500) {
          const listText = ol.textContent ?? "";
          if (/ilca\s*6|radial|standard/i.test(listText)) continue;
          return { size: items.length, confident: true };
        }
      }
    }
  } catch {
    // JSDOM parse failure — fall through
  }

  // Return text-mining result even if not confident.
  if (fromText) return fromText;
  return null;
}

/**
 * Count data rows in an HTML fragment.
 *
 * Splits on `<tr` and counts each chunk that contains `<td` (data row) but
 * not ILCA 6 text. Works across results systems where the position number
 * may be wrapped in spans/divs (Trofeo Sofia, etc.) rather than a bare <td>.
 */
function countPositionRowsInHtml(html: string): number {
  const parts = html.split(/<tr\b/i).slice(1);
  return parts.filter((part) => {
    const end = part.search(/<\/tr>/i);
    const row = end >= 0 ? part.slice(0, end) : part;
    return /<td\b/i.test(row) && !/ilca.?6/i.test(row);
  }).length;
}

/**
 * Playwright headless-browser fleet size extraction.
 *
 * Used for JS-rendered results pages (Manage2Sail, RaceQS, sailing.org results,
 * custom regatta sites, etc.) that return blank or incomplete HTML to plain fetch().
 *
 * Strategy:
 *  1. Intercept all HTML responses (page + AJAX) while the page loads.
 *  2. If the page has a class filter `<select>` with an "ILCA 7" option,
 *     select it and capture the resulting AJAX responses.
 *  3. Count position rows (<tr><td>N</td>…) across all captured HTML fragments.
 *     The fragment with the highest count across the ILCA 7 pass is the fleet size.
 *  4. Fall back to `extractFleetSizeFromText` on the rendered page body text.
 */
async function fetchFleetSizeHeadless(
  rawUrl: string,
  position?: number | null,
): Promise<{ size: number; confident: boolean } | null> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
  });
  const page = await context.newPage();

  // Track all text/html response URLs seen so far.
  const seenHtmlUrls = new Set<string>();
  // Collect HTML response bodies for fallback row-counting.
  const htmlFragments: string[] = [];
  page.on("response", (res) => {
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("text/html")) return;
    seenHtmlUrls.add(res.url());
    res.text().then((body) => {
      if (body.length > 200) htmlFragments.push(body);
    }).catch(() => { /* ignore decode errors */ });
  });

  try {
    await page.goto(rawUrl, { waitUntil: "networkidle", timeout: 30_000 });

    // Strategy 1 — if there's a class-filter dropdown with "ILCA 7", select it
    // and capture the resulting HTML AJAX response.
    // Arm the listener BEFORE triggering select (avoid racing the response).
    // Use text/html content-type guard to skip JS/CSS files loaded by the page.
    // Find a <select> that has an "ILCA 7" option, and get its CSS selector
    // and the exact option label text (for page.selectOption which requires strings).
    const classFilter = await page.evaluate(() => {
      for (const sel of Array.from(document.querySelectorAll("select"))) {
        const opt = Array.from(sel.options).find((o) => /ILCA\s*7/i.test(o.text));
        if (!opt) continue;
        const selector = sel.id ? `#${sel.id}` : sel.name ? `select[name="${sel.name}"]` : null;
        if (!selector) continue;
        return { selector, label: opt.text.trim() };
      }
      return null;
    });

    if (classFilter) {
      try {
        // Snapshot URLs already seen before the filter fires.
        const urlsBefore = new Set([...seenHtmlUrls, rawUrl]);
        const ilca7ResPromise = page.waitForResponse(
          (res) => {
            const ct = res.headers()["content-type"] ?? "";
            return ct.includes("text/html") && !urlsBefore.has(res.url());
          },
          { timeout: 10_000 },
        ).catch(() => null);

        // Use the exact label string — page.selectOption doesn't support regex.
        await page.selectOption(classFilter.selector, { label: classFilter.label });

        const ajaxRes = await ilca7ResPromise;
        if (ajaxRes) {
          const body = await ajaxRes.text().catch(() => "");
          const n = countPositionRowsInHtml(body);
          if (n >= 10) return { size: n, confident: true };
        }
      } catch {
        // Filter interaction failed — fall through to text mining.
      }
    }

    // Strategy 2 — count rows across all captured HTML fragments.
    // Covers pages that return all classes in one response or use static tables.
    let maxRowCount = 0;
    for (const frag of htmlFragments) {
      const n = countPositionRowsInHtml(frag);
      if (n > maxRowCount) maxRowCount = n;
    }
    if (maxRowCount >= 10) return { size: maxRowCount, confident: true };

    // Strategy 3 — text mining on rendered page body.
    const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    const fromText = extractFleetSizeFromText(bodyText, position);
    if (fromText) return fromText;

    return null;
  } catch (err) {
    console.warn(
      `[ws-enrich] headless fetch failed for ${rawUrl}: ${(err as Error).message}`,
    );
    return null;
  } finally {
    await browser.close();
  }
}

async function loadEvents(): Promise<WSEventRow[]> {
  const raw = await readFile(EVENTS_FILE, "utf8");
  const dump = JSON.parse(raw) as WSDump;
  return dump.events;
}

async function loadEnrichment(): Promise<EnrichmentFile> {
  try {
    const raw = await readFile(ENRICH_FILE, "utf8");
    return JSON.parse(raw) as EnrichmentFile;
  } catch {
    return { entries: {} };
  }
}

function deriveFromKnown(row: WSEventRow): Enrichment | null {
  const hit = KNOWN.find((k) => k.match(row));
  return hit ? { ...hit.data } : null;
}

async function main() {
  const events = await loadEvents();
  const file = await loadEnrichment();
  const out: Record<string, Enrichment> = { ...file.entries };

  let updated = 0;
  let preserved = 0;
  let skippedLocked = 0;

  // Pass 1: regatta-website scrape — venue + cover image in one fetch.
  // The scrape is authoritative for events with a `regattaWebsite`. We
  // filter scraped city matches by an ISO3 country code extracted from the
  // URL (e.g. `…-eurilca-europa-cup-mlt/` → MLT) when present, which
  // prevents hub pages from cross-bleeding wrong venues.
  const scrapedSet = new Set<string>();
  if (!args.noImages) {
    let venueHits = 0;
    let imgHits = 0;
    let processed = 0;
    for (const row of events) {
      if (processed >= args.limit) break;
      const cur = out[row.worldSailingEventId];
      if (cur?._locked) continue;
      const needsImg = !cur?.coverImageUrl || args.refreshImages;
      const needsVenue = !cur?.location || args.refreshImages;
      if (!needsImg && !needsVenue) continue;
      if (!row.regattaWebsite) continue;
      processed++;

      const urlCountry = countryFromUrl(row.regattaWebsite);
      try {
        const assets = await fetchRegattaSiteAssets(row, urlCountry);
        const next: Enrichment = { ...(cur ?? {}) };
        if (needsVenue && args.refreshImages) {
          delete next.location;
          delete next.countryCode;
        }
        if (assets?.venue && needsVenue) {
          next.location = assets.venue.location;
          next.countryCode = assets.venue.countryCode;
          scrapedSet.add(row.worldSailingEventId);
          venueHits++;
        }
        if (assets?.cover && needsImg) {
          next.coverImageUrl = assets.cover.localPath;
          next.coverImageSourceUrl = assets.cover.sourceUrl;
          imgHits++;
        }
        out[row.worldSailingEventId] = next;
      } catch (err) {
        console.warn(
          `[ws-enrich] site scrape failed for ${row.regattaName}: ${(err as Error).message}`,
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log(
      `[ws-enrich] regatta-site: venues=${venueHits} images=${imgHits} (processed ${processed})`,
    );
  }

  // Pass 2: news-derived diary excerpts + fleet size mining.
  // Runs BEFORE the KNOWN map so scraped fleet sizes take precedence over
  // hardcoded fallbacks.
  if (!args.noNews) {
    let newsHits = 0;
    let newsMisses = 0;
    let fleetHits = 0;
    let processed = 0;
    for (const row of events) {
      if (processed >= args.limit) break;
      const cur = out[row.worldSailingEventId];
      if (cur?._locked) continue;
      if (cur?.diaryExcerpt && !args.refreshNews) continue;
      processed++;

      try {
        const news = await fetchDiaryExcerpt(row);
        if (news) {
          const fleetUpdate: Partial<Enrichment> =
            news.fleetSize != null &&
            (cur?.totalCompetitors == null || args.refreshFleet)
              ? { totalCompetitors: news.fleetSize }
              : {};
          if (news.fleetSize != null) fleetHits++;
          out[row.worldSailingEventId] = {
            ...(cur ?? {}),
            diaryExcerpt: news.excerpt,
            diarySourceUrl: news.url,
            diarySourceName: news.source,
            ...fleetUpdate,
            // Only override an existing scraped cover if we found a new one.
            ...(news.coverImagePublicPath
              ? {
                  coverImageUrl: news.coverImagePublicPath,
                  coverImageSourceUrl: news.coverImageSourceUrl,
                }
              : {}),
          };
          newsHits++;
        } else if (args.refreshNews && cur) {
          // Refresh requested but no match found — clear stale diary fields.
          const cleaned: Enrichment = { ...cur };
          delete cleaned.diaryExcerpt;
          delete cleaned.diarySourceUrl;
          delete cleaned.diarySourceName;
          out[row.worldSailingEventId] = cleaned;
          newsMisses++;
        } else {
          newsMisses++;
        }
      } catch (err) {
        console.warn(
          `[ws-enrich] news fetch failed for ${row.regattaName}: ${(err as Error).message}`,
        );
        newsMisses++;
      }

      // Be polite — Google News RSS rate-limits aggressive scrapes.
      await new Promise((r) => setTimeout(r, 600));
    }
    console.log(
      `[ws-enrich] news: hits=${newsHits} misses=${newsMisses} fleet_found=${fleetHits} (processed ${processed})`,
    );
  }

  // Pass 3: fleet-size-only pass — fetch resultsUrl pages for events that
  // still don't have a totalCompetitors after the news pass.
  if (!args.noFleet) {
    let fleetHits = 0;
    let fleetMisses = 0;
    let processed = 0;
    for (const row of events) {
      if (processed >= args.limit) break;
      const cur = out[row.worldSailingEventId];
      if (cur?._locked) continue;
      if (cur?.totalCompetitors != null && !args.refreshFleet) continue;

      // Try resultsUrl first (more likely to have per-class breakdown),
      // then fall back to regattaWebsite.
      const url = cur?.resultsUrl ?? row.regattaWebsite;
      if (!url) continue;
      processed++;

      try {
        const found = await fetchFleetSizeFromUrl(url, row.position);
        if (found) {
          // Sanity check: fleet can't be smaller than the sailor's known position.
          if (row.position != null && found.size <= row.position) {
            console.warn(
              `[ws-enrich] fleet: rejected ${found.size} for ${row.regattaName} (pos=${row.position})`,
            );
            fleetMisses++;
          } else {
            out[row.worldSailingEventId] = {
              ...(cur ?? {}),
              totalCompetitors: found.size,
            };
            console.log(
              `[ws-enrich] fleet: ${row.regattaName} (${row.startDate.slice(0, 4)}) → ${found.size}${found.confident ? "" : " (low-confidence)"}`,
            );
            fleetHits++;
          }
        } else {
          fleetMisses++;
        }
      } catch (err) {
        console.warn(
          `[ws-enrich] fleet fetch failed for ${row.regattaName}: ${(err as Error).message}`,
        );
        fleetMisses++;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log(
      `[ws-enrich] fleet-pass: hits=${fleetHits} misses=${fleetMisses} (processed ${processed})`,
    );
  }

  // Pass 4: Playwright headless pass — JS-rendered results pages.
  // Only runs with --headless flag (slower, needs Chromium). Targets events
  // that still have no fleet size after the static passes.
  if (args.headless) {
    let headlessHits = 0;
    let headlessMisses = 0;
    let processed = 0;
    for (const row of events) {
      if (processed >= args.limit) break;
      const cur = out[row.worldSailingEventId];
      if (cur?._locked) continue;
      if (cur?.totalCompetitors != null && !args.refreshFleet) continue;

      const url = cur?.resultsUrl ?? row.regattaWebsite;
      if (!url) continue;
      processed++;

      try {
        const found = await fetchFleetSizeHeadless(url, row.position);
        if (found) {
          if (row.position != null && found.size <= row.position) {
            console.warn(
              `[ws-enrich] headless: rejected ${found.size} for ${row.regattaName} (pos=${row.position})`,
            );
            headlessMisses++;
          } else {
            out[row.worldSailingEventId] = {
              ...(cur ?? {}),
              totalCompetitors: found.size,
            };
            console.log(
              `[ws-enrich] headless: ${row.regattaName} (${row.startDate.slice(0, 4)}) → ${found.size}${found.confident ? "" : " (low-confidence)"}`,
            );
            headlessHits++;
          }
        } else {
          headlessMisses++;
        }
      } catch (err) {
        console.warn(
          `[ws-enrich] headless pass failed for ${row.regattaName}: ${(err as Error).message}`,
        );
        headlessMisses++;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    console.log(
      `[ws-enrich] headless-pass: hits=${headlessHits} misses=${headlessMisses} (processed ${processed})`,
    );
  }

  // Pass 5: KNOWN map. Last-resort fallback for events where scraping found
  // nothing. For scraped events, KNOWN only fills still-missing fields.
  for (const row of events) {
    const existing = out[row.worldSailingEventId];
    if (existing?._locked) {
      skippedLocked++;
      continue;
    }
    const known = deriveFromKnown(row);
    if (!known) {
      if (existing) preserved++;
      continue;
    }
    const merged: Enrichment = { ...(existing ?? {}) };
    const wasScraped = scrapedSet.has(row.worldSailingEventId);
    // For non-scraped events, KNOWN venue values are authoritative.
    if (!wasScraped) {
      if (known.location) merged.location = known.location;
      if (known.countryCode) merged.countryCode = known.countryCode;
    }
    // Fleet size: KNOWN values are authoritative — they're sourced from federation
    // press releases and entry archives, which are more reliable than generic-URL
    // scraping (which can pick up the current year's fleet for historical events).
    if (known.totalCompetitors != null)
      merged.totalCompetitors = known.totalCompetitors;
    if (!merged.resultsUrl && known.resultsUrl)
      merged.resultsUrl = known.resultsUrl;
    out[row.worldSailingEventId] = merged;
    updated++;
  }

  const dump: EnrichmentFile = {
    generatedAt: new Date().toISOString(),
    _format:
      "Keyed by World Sailing event UUID. Each value: { countryCode, location, totalCompetitors, resultsUrl, _locked, notes }. _locked: true means the enrich script will not overwrite — set this on hand-curated entries.",
    entries: out,
  };

  console.log(
    `[ws-enrich] events=${events.length} matched=${updated} preserved=${preserved} locked=${skippedLocked}`,
  );

  if (args.dry) {
    console.log(JSON.stringify(dump, null, 2).slice(0, 2000));
    return;
  }

  await writeFile(ENRICH_FILE, JSON.stringify(dump, null, 2) + "\n", "utf8");
  console.log(
    `[ws-enrich] wrote ${path.relative(PROJECT_ROOT, ENRICH_FILE)}`,
  );
}

void ALPHA3; // exported for future tier-2 use; silence unused-var

main().catch((err) => {
  console.error("[ws-enrich] failed:", err);
  process.exit(1);
});
