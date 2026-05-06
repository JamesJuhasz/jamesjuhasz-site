/*
  World Sailing → site-shaped data.

  Sources:
    src/data/world-sailing-events.json       — verified profile data
    src/data/world-sailing-enrichment.json   — venue/fleet/links from web scrape

  Both are checked-in fixtures. This module is a pure file read — safe at
  build time and inside server components.

  The output `Result` shape mirrors `src/lib/results.ts` so it slots into the
  existing pages without UI changes. The output `SeedEvent` shape mirrors
  `src/lib/seed-data.ts` so EventCard renders unchanged.
*/

import wsRaw from "@/data/world-sailing-events.json";
import enrichmentRaw from "@/data/world-sailing-enrichment.json";
import { getVerified, getReview } from "@/lib/scrape/verified-accessor";
import type { Result } from "@/lib/results";
import type { SeedEvent, CoverImage } from "@/lib/seed-data";

export type WSEventRow = {
  worldSailingEventId: string;
  worldSailingRegattaId: string;
  worldSailingRegattaCode: string | null;
  regattaName: string;
  startDate: string;
  endDate: string;
  position: number | null;
  className: string;
  classCode: string;
  discipline: string | null;
  grade: string | null;
  eventName: string | null;
  regattaWebsite: string | null;
  description: string | null;
  sailNumber: string | null;
};

type WSDump = {
  fetchedAt: string;
  source: string;
  sailorName: string;
  worldSailingId: string | null;
  events: WSEventRow[];
};

export type WSEnrichment = {
  /** ISO 3166-1 alpha-3, e.g. "ESP". */
  countryCode?: string;
  /** Display location, e.g. "Palma de Mallorca, Spain". */
  location?: string;
  /** Fleet size for the sailor's class only. */
  totalCompetitors?: number;
  /** Public results page URL. */
  resultsUrl?: string;
  /** Diary-style description scraped from a news source. */
  diaryExcerpt?: string;
  /** URL the excerpt came from. */
  diarySourceUrl?: string;
  /** Outlet name, e.g. "Sail-World" or "Google News". */
  diarySourceName?: string;
  /** Local public path to a regatta-relevant photo scraped from news. */
  coverImageUrl?: string;
  /** External URL the image came from (for attribution). */
  coverImageSourceUrl?: string;
  /** True = entered by hand; the enrichment script will not overwrite. */
  _locked?: boolean;
  /** Free-form notes; never rendered. */
  notes?: string;
};

type EnrichmentFile = {
  generatedAt?: string;
  entries: Record<string, WSEnrichment>;
};

const dump = wsRaw as WSDump;
const enrichments = (enrichmentRaw as EnrichmentFile).entries ?? {};

/* ---------------------------------------------------------------------------
   Cover-image map. Keyed by World Sailing event UUID (stable across re-fetch).
   Add entries here when a confident photo→regatta match exists. Anything
   unmapped renders without an image (cleanly handled by EventCard).
-------------------------------------------------------------------------- */
const COVER_IMAGES: Record<string, { url: string; alt?: string }> = {
  // 2026 Trofeo Princesa Sofía — sailing-energy press photo
  // (Filled in by id below when fetch script has run.)
};

/* Map by `regattaName` + year fallback so re-fetched UUIDs that change
   stability still resolve. Lookup order: id → name+year. */
const COVER_BY_NAME_YEAR: Array<{
  match: (row: WSEventRow) => boolean;
  image: { url: string; alt?: string };
}> = [
  {
    match: (r) =>
      r.regattaName.includes("Trofeo S.A.R Princesa Sofia") &&
      r.startDate.startsWith("2026"),
    image: {
      url: "/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1927-edit-2_(2).jpg",
      alt: "Trofeo Princesa Sofía race day",
    },
  },
  {
    match: (r) =>
      r.regattaName.includes("Trofeo S.A.R Princesa Sofia") &&
      r.startDate.startsWith("2025"),
    image: {
      url: "/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1922-edit-2_(2).jpg",
      alt: "Trofeo Princesa Sofía",
    },
  },
  {
    match: (r) =>
      r.regattaName.includes("CORK") && r.startDate.startsWith("2024"),
    image: {
      url: "/images/hero-candidates/dsc09574.jpg",
      alt: "CORK International Regatta — Kingston",
    },
  },
  {
    match: (r) =>
      r.regattaName.includes("Kieler Woche") && r.startDate.startsWith("2025"),
    image: {
      url: "/images/hero-candidates/dsc09641.jpg",
      alt: "Kieler Woche — Baltic",
    },
  },
  {
    match: (r) =>
      r.regattaName.includes("EurILCA Europa Cup - Malta") &&
      r.startDate.startsWith("2024"),
    image: {
      url: "/images/hero-candidates/dsc02709.jpg",
      alt: "EurILCA Europa Cup — Malta",
    },
  },
  {
    match: (r) => r.regattaName.includes("World Championship"),
    image: {
      url: "/images/hero-candidates/dsc09449.jpg",
      alt: "ILCA 7 World Championship",
    },
  },
  {
    match: (r) => r.regattaName.includes("EurILCA Senior European"),
    image: {
      url: "/images/hero-candidates/dsc04465.jpg",
      alt: "EurILCA Senior European Championship",
    },
  },
  {
    match: (r) => /Semaine Olympique Francaise/i.test(r.regattaName),
    image: {
      url: "/images/hero-candidates/dsc02737.jpg",
      alt: "Semaine Olympique Française de Voile — Hyères",
    },
  },
  {
    match: (r) => /Portugal Grand Prix/i.test(r.regattaName),
    image: {
      url: "/images/hero-candidates/dsc09165.jpg",
      alt: "Portugal Grand Prix — Vilamoura",
    },
  },
  {
    match: (r) => /Campionato Italiano/i.test(r.regattaName),
    image: {
      url: "/images/hero-candidates/dsc04776.jpg",
      alt: "Campionato Italiano Classi Olimpiche — Palermo",
    },
  },
];

// /public/images/section/01..08.jpg — eight generic sailing photos used as
// the final fallback so no card ever renders the empty trophy-icon state.
const SECTION_FALLBACK_COUNT = 8;

// Stable djb2-style hash so the same event always lands on the same fallback
// image (no shuffling between renders) and adjacent events spread across the
// available photos rather than clustering.
function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function coverFor(row: WSEventRow): CoverImage | undefined {
  // Priority: scraped news image → hand-curated by-id map → by-name+year
  // map → deterministic section/* fallback. Scraped images are regatta-
  // relevant photos pulled from news articles by the enrichment script
  // (downloaded to /public/images/regattas).
  const enr = enrichments[row.worldSailingEventId];
  if (enr?.coverImageUrl) {
    return {
      asset: { url: enr.coverImageUrl },
      alt: `${row.regattaName} — ${row.startDate.slice(0, 4)}`,
    };
  }
  const direct = COVER_IMAGES[row.worldSailingEventId];
  if (direct) return { asset: { url: direct.url }, alt: direct.alt };
  const fallback = COVER_BY_NAME_YEAR.find((m) => m.match(row));
  if (fallback) return { asset: { url: fallback.image.url }, alt: fallback.image.alt };

  // Final fallback: a generic sailing photo from /public/images/section/.
  // The hash ensures the same event always picks the same photo across
  // re-renders, and the modulo spreads adjacent events across the pool so
  // a row of cards doesn't repeat the same image.
  const idx = (stableHash(row.worldSailingEventId) % SECTION_FALLBACK_COUNT) + 1;
  const num = String(idx).padStart(2, "0");
  return {
    asset: { url: `/images/section/${num}.jpg` },
    alt: `${row.regattaName} — ${row.startDate.slice(0, 4)}`,
  };
}

/* ---------------------------------------------------------------------------
   Title polishing — WS uses some idiosyncratic capitalisation.
-------------------------------------------------------------------------- */
function polishRegattaName(name: string): string {
  return name
    .replace(/\bS\.A\.R\b/g, "S.A.R.")
    .replace(/\s+\/\s+World Cup Series$/, " · World Cup Series")
    .replace(/\s+\/\s+Hempel World Cup Series$/, " · Hempel World Cup Series")
    .replace(/CORK OCR \(Olympic Classes Regatta\)/i, "CORK OCR")
    .replace(/Cork OCR \(Olympic Classes Regatta\)/i, "CORK OCR")
    .replace(/\(Olympic Classes Regatta\)/i, "")
    .trim();
}

function slugFor(row: WSEventRow): string {
  const base = polishRegattaName(row.regattaName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${base}-${row.startDate.slice(0, 4)}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ---------------------------------------------------------------------------
   Public API
-------------------------------------------------------------------------- */

export type WSEventDetail = {
  slug: string;
  title: string;
  eventDate: string;
  endDate: string;
  location: string | undefined;
  countryCode: string | undefined;
  resultPosition: string | undefined;
  totalCompetitors: number | undefined;
  fleet: string;
  diaryExcerpt: string | undefined;
  diarySourceUrl: string | undefined;
  diarySourceName: string | undefined;
  externalUrl: string | undefined;
  coverImage: CoverImage | undefined;
};

export function getWorldSailingEventBySlug(slug: string): WSEventDetail | null {
  const row = dump.events.find((r) => slugFor(r) === slug);
  if (!row) return null;
  const enr = enrichments[row.worldSailingEventId] ?? {};
  const verified = getVerified(row.worldSailingEventId);
  return {
    slug,
    title: polishRegattaName(row.regattaName),
    eventDate: row.startDate,
    endDate: row.endDate,
    location: enr.location,
    countryCode: enr.countryCode,
    resultPosition: (() => {
      // Reviewer can flag a specific entry to override WS with the
      // extracted position (rare — WS is canonical otherwise).
      if (verified?.overrideWsPosition && verified.externalPosition != null) {
        return ordinal(verified.externalPosition);
      }
      return row.position != null ? ordinal(row.position) : undefined;
    })(),
    totalCompetitors: verified?.totalCompetitors ?? enr.totalCompetitors,
    fleet: verified?.fleet ?? row.className,
    diaryExcerpt: enr.diaryExcerpt,
    diarySourceUrl: enr.diarySourceUrl,
    diarySourceName: enr.diarySourceName,
    externalUrl: verified?.primarySource.url ?? enr.resultsUrl ?? row.regattaWebsite ?? undefined,
    coverImage: coverFor(row),
  };
}

export function getWorldSailingSlugs(): string[] {
  return dump.events.map((r) => slugFor(r));
}

export function getWorldSailingAdjacentEvents(
  slug: string,
): { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null } {
  const sorted = dump.events
    .slice()
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const idx = sorted.findIndex((r) => slugFor(r) === slug);
  if (idx === -1) return { prev: null, next: null };
  const prev = idx > 0
    ? { slug: slugFor(sorted[idx - 1]), title: polishRegattaName(sorted[idx - 1].regattaName) }
    : null;
  const next = idx < sorted.length - 1
    ? { slug: slugFor(sorted[idx + 1]), title: polishRegattaName(sorted[idx + 1].regattaName) }
    : null;
  return { prev, next };
}

export function getWorldSailingResults(): Result[] {
  const rows = dump.events.slice().sort((a, b) =>
    a.startDate < b.startDate ? 1 : -1,
  );
  return rows.map((row) => toResult(row));
}

export function getWorldSailingPastEvents(): SeedEvent[] {
  const rows = dump.events.slice().sort((a, b) =>
    a.startDate < b.startDate ? 1 : -1,
  );
  return rows.map((row) => toSeedEvent(row));
}

export function getWorldSailingMeta() {
  return {
    fetchedAt: dump.fetchedAt,
    source: dump.source,
    sailorName: dump.sailorName,
    worldSailingId: dump.worldSailingId,
    eventCount: dump.events.length,
  };
}

function toResult(row: WSEventRow): Result {
  const enr = enrichments[row.worldSailingEventId] ?? {};
  const verified = getVerified(row.worldSailingEventId);
  const review = getReview(row.worldSailingEventId);
  const cover = coverFor(row);
  const title = polishRegattaName(row.regattaName);

  // Overlay precedence for the enrichment fields:
  //   verified-results (multi-factor scored)  →  ws-enrichment (legacy)  →  WS row
  // Position is WS-only by default (federation is canonical), unless the
  // reviewer explicitly flagged the verified entry with overrideWsPosition,
  // in which case the human-confirmed externalPosition wins for this one
  // entry. See `VerifiedResult.overrideWsPosition` for the rationale.
  const totalCompetitors = verified?.totalCompetitors ?? enr.totalCompetitors ?? null;
  const positionString =
    verified?.overrideWsPosition && verified.externalPosition != null
      ? String(verified.externalPosition)
      : row.position !== null
        ? String(row.position)
        : null;
  const externalUrl = verified?.primarySource.url ?? enr.resultsUrl ?? row.regattaWebsite ?? null;
  // When no confirmed URL exists but a review candidate does, surface it so
  // visitors can check while the human review is pending.
  const pendingUrl = !verified && !enr.resultsUrl && !row.regattaWebsite && review
    ? review.primarySource.url
    : null;
  const source = verified
    ? `Official results · verified ${verified.confidenceScore.toFixed(2)}`
    : enr.resultsUrl
      ? "Official results"
      : "World Sailing";

  return {
    id: `ws-${row.worldSailingEventId}`,
    title,
    startDate: row.startDate,
    endDate: row.endDate,
    country: enr.countryCode ?? null,
    position: positionString,
    totalCompetitors,
    fleet: verified?.fleet ?? row.className ?? null,
    externalUrl,
    source,
    coverImage: cover ? { url: cover.asset.url, alt: cover.alt } : undefined,
    excerpt: enr.diaryExcerpt,
    slug: slugFor(row),
    location: enr.location,
    pendingUrl,
  };
}

function toSeedEvent(row: WSEventRow): SeedEvent {
  const enr = enrichments[row.worldSailingEventId] ?? {};
  const title = polishRegattaName(row.regattaName);
  const cover = coverFor(row);
  return {
    slug: slugFor(row),
    title,
    eventDate: row.startDate,
    endDate: row.endDate,
    location: enr.location ?? "",
    category: "Regatta",
    status: "past",
    resultPosition: row.position !== null ? ordinal(row.position) : undefined,
    excerpt: buildExcerpt(row, enr),
    coverImage: cover,
  };
}

function buildExcerpt(row: WSEventRow, enr: WSEnrichment): string {
  // Prefer a news-derived diary excerpt if the enrichment script found one.
  if (enr.diaryExcerpt && enr.diaryExcerpt.length > 0) return enr.diaryExcerpt;

  const parts: string[] = [];
  if (row.position !== null) {
    parts.push(`Finished ${ordinal(row.position)}`);
    if (enr.totalCompetitors) {
      parts.push(`of ${enr.totalCompetitors}`);
    }
  }
  if (row.className) parts.push(`in the ${row.className} fleet`);
  const head = parts.join(" ").trim();
  return head ? `${head}.` : `${row.className} class event.`;
}
