/*
  scripts/fetch-ongoing-results.ts
  ---------------------------------------------------------------------------
  Live-scoreboard scraper for currently-running regattas.

  Pulls ongoing regattas from src/lib/ongoing, runs the existing
  src/lib/scrape/discover pipeline to find a results URL per regatta
  (cached after first hit), extracts position via extract-html, and writes
  src/data/results-ongoing.json.

  URL discovery is cached on the `resolvedUrl` field so Brave Search fires
  at most once per regatta lifetime. The cache is invalidated when extraction
  has failed for FAIL_THRESHOLD consecutive runs, or when --force-rediscover
  is passed for a specific slug.

  Run:
    npm run results:fetch-ongoing
    npx tsx scripts/fetch-ongoing-results.ts --dry
    npx tsx scripts/fetch-ongoing-results.ts --force-rediscover=sofia-2026
*/

import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getOngoingRegattas,
  type OngoingScrapedFile,
  type OngoingScrapedItem,
} from "../src/lib/ongoing";
import { discoverCandidates } from "../src/lib/scrape/discover";
import { extractFromHtml } from "../src/lib/scrape/extract-html";
import { extractFromPdf } from "../src/lib/scrape/extract-pdf";
import { bufferToText, fetchUrl, isPdf } from "../src/lib/scrape/fetch";
import {
  deriveNoticeBoardUrl,
  findNoticeBoardAnchor,
} from "../src/lib/scrape/onb";
import type { WSEventLite } from "../src/lib/scrape/types";
import wsDump from "../src/data/world-sailing-events.json";

type WSRow = {
  regattaName: string;
  startDate: string;
  endDate: string | null;
  worldSailingEventId: string;
  worldSailingRegattaCode: string | null;
  regattaWebsite: string | null;
  className: string;
  classCode: string;
  eventName: string | null;
  sailNumber: string;
};

function normTitle(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Locate the matching WS row by normalized title within ±7 days of the
 * ongoing-regatta start. When WS has already published the federation entry
 * (rare for true ongoing regattas, common when simulating with FAKE_TODAY
 * against past events), we carry forward its `regattaWebsite` and
 * `regattaCode` so the discover pipeline has its full toolkit.
 */
function findMatchingWsRow(title: string, startDate: string): WSRow | null {
  const wantNorm = normTitle(title);
  const wantMs = new Date(`${startDate}T00:00:00Z`).getTime();
  for (const r of wsDump.events as WSRow[]) {
    if (normTitle(r.regattaName).replace(/\./g, "") !== wantNorm.replace(/\./g, "")) continue;
    const rowMs = new Date(`${r.startDate}T00:00:00Z`).getTime();
    if (Math.abs(rowMs - wantMs) <= 7 * 86_400_000) return r;
  }
  return null;
}

dotenv.config({ path: ".env.local" });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_FILE = path.join(PROJECT_ROOT, "src", "data", "results-ongoing.json");

const args = {
  dry: process.argv.includes("--dry"),
  forceRediscover: (() => {
    const m = process.argv.find((a) => a.startsWith("--force-rediscover="));
    return m ? m.split("=")[1] : null;
  })(),
};

const FAIL_THRESHOLD = 3;

async function readDataFile(): Promise<OngoingScrapedFile> {
  if (!existsSync(DATA_FILE)) return { items: [] };
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<OngoingScrapedFile>;
  return { items: Array.isArray(parsed.items) ? parsed.items : [] };
}

async function writeDataFile(file: OngoingScrapedFile) {
  const tmp = DATA_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(file, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

function bootstrapWSEvent(r: {
  title: string;
  startDate: string;
  endDate: string;
}): WSEventLite {
  const ws = findMatchingWsRow(r.title, r.startDate);
  return {
    worldSailingEventId: ws?.worldSailingEventId ?? "",
    worldSailingRegattaCode: ws?.worldSailingRegattaCode ?? null,
    regattaName: ws?.regattaName ?? r.title,
    startDate: r.startDate,
    endDate: r.endDate,
    position: null,
    className: ws?.className ?? "ILCA 7",
    classCode: ws?.classCode ?? "ILCA7",
    eventName: ws?.eventName ?? r.title,
    regattaWebsite: ws?.regattaWebsite ?? null,
    sailNumber: ws?.sailNumber ?? null,
  };
}

type ExtractionResult = {
  position: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  finalUrl: string;
  html: string | null;
};

async function fetchAndExtract(url: string): Promise<ExtractionResult | null> {
  const r = await fetchUrl(url);
  if (!r.ok) return null;
  if (isPdf(r.contentType, r.body)) {
    const e = await extractFromPdf(r.body);
    return {
      position: e.externalPosition,
      totalCompetitors: e.totalCompetitors,
      fleet: e.fleet,
      finalUrl: r.finalUrl,
      html: null,
    };
  }
  const html = bufferToText(r.body);
  const e = extractFromHtml(html);
  return {
    position: e.externalPosition,
    totalCompetitors: e.totalCompetitors,
    fleet: e.fleet,
    finalUrl: r.finalUrl,
    html,
  };
}

async function scrapeOne(
  regatta: { slug: string; title: string; startDate: string; endDate: string },
  existing: OngoingScrapedItem | undefined,
): Promise<OngoingScrapedItem> {
  const forceRediscover =
    args.forceRediscover === regatta.slug ||
    (existing?.failedExtractions ?? 0) >= FAIL_THRESHOLD;

  const cachedUrl = !forceRediscover ? (existing?.resolvedUrl ?? null) : null;
  const wsEvent = bootstrapWSEvent(regatta);

  let resolvedUrl: string | null = cachedUrl;
  let html: string | null = null;
  let extraction: ExtractionResult | null = null;

  if (cachedUrl) {
    extraction = await fetchAndExtract(cachedUrl);
    if (extraction && extraction.position !== null) {
      resolvedUrl = cachedUrl;
      html = extraction.html;
    } else {
      const failedExtractions = (existing?.failedExtractions ?? 0) + 1;
      return {
        slug: regatta.slug,
        title: regatta.title,
        startDate: regatta.startDate,
        endDate: regatta.endDate,
        position: null,
        totalCompetitors: null,
        fleet: null,
        externalUrl: existing?.externalUrl ?? null,
        noticeBoardUrl: existing?.noticeBoardUrl ?? null,
        source: existing?.source ?? null,
        resolvedUrl: cachedUrl,
        resolvedAt: existing?.resolvedAt ?? null,
        failedExtractions,
        scrapedAt: new Date().toISOString(),
      };
    }
  } else {
    const candidates = await discoverCandidates(wsEvent);
    for (const c of candidates) {
      const r = await fetchAndExtract(c.url);
      if (r && r.position !== null) {
        resolvedUrl = r.finalUrl;
        extraction = r;
        html = r.html;
        break;
      }
    }
  }

  if (!extraction || extraction.position === null) {
    return {
      slug: regatta.slug,
      title: regatta.title,
      startDate: regatta.startDate,
      endDate: regatta.endDate,
      position: null,
      totalCompetitors: null,
      fleet: null,
      externalUrl: existing?.externalUrl ?? null,
      noticeBoardUrl: existing?.noticeBoardUrl ?? null,
      source: existing?.source ?? null,
      resolvedUrl: existing?.resolvedUrl ?? null,
      resolvedAt: existing?.resolvedAt ?? null,
      failedExtractions: (existing?.failedExtractions ?? 0) + 1,
      scrapedAt: new Date().toISOString(),
    };
  }

  let noticeBoardUrl = existing?.noticeBoardUrl ?? null;
  if (!noticeBoardUrl && resolvedUrl) {
    noticeBoardUrl =
      deriveNoticeBoardUrl(resolvedUrl) ??
      (html ? findNoticeBoardAnchor(html, resolvedUrl) : null);
  }
  // Fallback: the resolved scoreboard often lives on a scoring host (sailti,
  // manage2sail) while the ONB lives on the regatta's own site. When the
  // resolved URL had no ONB hint — e.g. it was a PDF — try the WS-supplied
  // regatta website too.
  if (!noticeBoardUrl && wsEvent.regattaWebsite) {
    try {
      const r = await fetchUrl(wsEvent.regattaWebsite);
      if (r.ok && !isPdf(r.contentType, r.body)) {
        noticeBoardUrl = findNoticeBoardAnchor(
          bufferToText(r.body),
          r.finalUrl,
        );
      }
    } catch {
      // ignore — ONB is best-effort
    }
  }

  let host: string | null = null;
  try {
    host = resolvedUrl ? new URL(resolvedUrl).host : null;
  } catch {
    host = null;
  }

  return {
    slug: regatta.slug,
    title: regatta.title,
    startDate: regatta.startDate,
    endDate: regatta.endDate,
    position: String(extraction.position),
    totalCompetitors: extraction.totalCompetitors,
    fleet: extraction.fleet,
    externalUrl: resolvedUrl,
    noticeBoardUrl,
    source: host,
    resolvedUrl,
    resolvedAt: existing?.resolvedAt ?? new Date().toISOString(),
    failedExtractions: 0,
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const file = await readDataFile();
  const existingBySlug = new Map(file.items.map((it) => [it.slug, it]));

  const regattas = await getOngoingRegattas();
  console.log(`[ongoing] ${regattas.length} ongoing regatta(s) detected.`);

  const updated: OngoingScrapedItem[] = [];
  for (const r of regattas) {
    process.stdout.write(`  · ${r.slug}  ${r.title} … `);
    const out = await scrapeOne(r, existingBySlug.get(r.slug));
    if (out.position) {
      console.log(
        `#${out.position}${out.totalCompetitors ? `/${out.totalCompetitors}` : ""}`,
      );
    } else {
      console.log(`no position (fails=${out.failedExtractions})`);
    }
    updated.push(out);
  }

  if (args.dry) {
    console.log(`[ongoing] --dry: would write ${updated.length} items.`);
    return;
  }
  await writeDataFile({ items: updated });
  console.log(
    `[ongoing] wrote ${updated.length} items to ${path.relative(PROJECT_ROOT, DATA_FILE)}`,
  );
}

main().catch((err) => {
  console.error("[ongoing] failed:", err);
  process.exit(1);
});
