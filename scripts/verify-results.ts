/*
  scripts/verify-results.ts
  ---------------------------------------------------------------------------
  Replaces scripts/fetch-results.ts. The contract:

    - Read src/data/world-sailing-events.json (federation truth — never altered).
    - For each ILCA 7 event, discover candidate result pages, extract James's
      row from each, score the result, and write three output files based on
      the bucketing thresholds:

          ≥ 0.90                            →  results-verified.json
          any candidate (incl. score 0)     →  results-review.json
          no candidates at all              →  results-rejected.json

      Anything that produced at least one parsed candidate ends up in the
      review file alongside its confidence score, so a human can see and
      adjudicate every imperfect extraction. The rejected file is reserved
      for events where every fetch failed — i.e., nothing to review.

    - Never overwrite federation data. The pipeline only adds enrichment fields
      (results URL, total competitors, fleet label, citation), and only when
      external evidence agrees with WS.

  Run:
    npm run results:verify                        # full run
    npx tsx scripts/verify-results.ts --dry       # don't write
    npx tsx scripts/verify-results.ts --limit=3   # cap events processed
    npx tsx scripts/verify-results.ts --force     # ignore retry backoff
    npx tsx scripts/verify-results.ts --event=<wsId>  # single event
*/

import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
// Load .env.local for local runs. CI injects secrets via `env:` so this is a no-op there.
dotenv.config({ path: ".env.local" });

import { extractFromHtml } from "../src/lib/scrape/extract-html";
import { extractFromPdf } from "../src/lib/scrape/extract-pdf";
import { launchPlaywrightSession, type PlaywrightSession } from "../src/lib/scrape/extract-playwright";
import { discoverCandidates } from "../src/lib/scrape/discover";
import { bufferToText, fetchUrl, isPdf } from "../src/lib/scrape/fetch";
import {
  classMatchScore,
  dateOverlapScore,
  eventNameSimilarity,
  nameMatchScore,
} from "../src/lib/scrape/match";
import { ACCEPT_THRESHOLD, REVIEW_THRESHOLD, computeScore } from "../src/lib/scrape/score";
import { domainOf, tierOfWithLearning, tierScore } from "../src/lib/scrape/source-tier";
import { loadLearnedTrustIndex, type LearnedTrustIndex } from "../src/lib/scrape/trusted-sources";
import type {
  ConfidenceBreakdown,
  ContentType,
  RejectedEntry,
  ResultCandidate,
  ResultsRejectedFile,
  ResultsReviewFile,
  ResultsVerifiedFile,
  VerifiedResult,
  WSEventLite,
} from "../src/lib/scrape/types";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "src", "data");
const WS_FILE = path.join(DATA_DIR, "world-sailing-events.json");
const VERIFIED_FILE = path.join(DATA_DIR, "results-verified.json");
const REVIEW_FILE = path.join(DATA_DIR, "results-review.json");
const REJECTED_FILE = path.join(DATA_DIR, "results-rejected.json");

const ARGS = (() => {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const eventArg = process.argv.find((a) => a.startsWith("--event="));
  return {
    dry: process.argv.includes("--dry"),
    force: process.argv.includes("--force"),
    limit: limitArg ? Math.max(1, Number(limitArg.split("=")[1])) || Infinity : Infinity,
    eventFilter: eventArg ? eventArg.split("=")[1] : null,
  };
})();

const TARGET_CLASS_CODES = new Set(["ILCA7"]);
const RETRY_SCHEDULE_DAYS = [1, 3, 7, 14] as const;
const MAX_PLAYWRIGHT_PER_EVENT = 4;

// Populated once in main() from results-trusted-sources.json so per-URL
// tier lookups stay synchronous. Empty until set; that's fine — the only
// effect of an empty index is "no tier promotion".
let LEARNING_INDEX: LearnedTrustIndex = new Map();
function tierForUrl(url: string): ReturnType<typeof tierOfWithLearning> {
  return tierOfWithLearning(url, LEARNING_INDEX.get(domainOf(url)) ?? 0);
}

type WSDump = {
  fetchedAt: string;
  source: string;
  sailorName: string;
  worldSailingId: string | null;
  events: WSEventLite[];
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (!existsSync(file)) return fallback;
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson(file: string, data: unknown) {
  const tmp = file + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextRetryAt(attemptCount: number): string | null {
  // attemptCount is the number of attempts AFTER this one (0-indexed into RETRY_SCHEDULE_DAYS).
  if (attemptCount >= RETRY_SCHEDULE_DAYS.length) return null;
  const days = RETRY_SCHEDULE_DAYS[attemptCount];
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function isReadyForRetry(entry: RejectedEntry | undefined, force: boolean): boolean {
  if (!entry) return true;
  if (force) return true;
  if (!entry.nextRetryAt) return false; // permanently given up
  return Date.parse(entry.nextRetryAt) <= Date.now();
}

/**
 * Score a single (event, extraction) pair.
 *
 * Builds the ConfidenceBreakdown by combining:
 *   - extraction signals (name, dates, class, position)
 *   - WS ground-truth comparison (positionAgreement)
 *   - source tier of the URL host
 */
function buildBreakdown(
  event: WSEventLite,
  ext: {
    externalPosition: number | null;
    classDetection: "match" | "mismatch" | "absent";
    pageDates: string[];
    pageTitle: string;
  },
  url: string,
): { breakdown: ConfidenceBreakdown; pageHasNoDates: boolean } {
  const tier = tierForUrl(url);

  const eventNameMatch = Math.max(
    eventNameSimilarity(event.regattaName, ext.pageTitle || ""),
    eventNameSimilarity(event.eventName ?? "", ext.pageTitle || ""),
  );

  // Many archived results pages (cork.org/past-results/results2017/…,
  // 2022ilca7men.ilca-worlds.org, …) carry the event year in the URL path
  // even when the page body lacks an explicit date. When the URL contains a
  // year matching the WS event, synthesize a date inside the WS window so
  // dateOverlapScore can credit it. We don't synthesize when the URL year
  // contradicts the WS year — that would mask a real mismatch.
  const wsYear = event.startDate.slice(0, 4);
  const urlYears = Array.from(url.matchAll(/(?<![\d])(20\d{2})(?![\d])/g))
    .map((m) => m[1]);
  const urlYearMatchesWs = urlYears.includes(wsYear);
  const augmentedDates = urlYearMatchesWs
    ? [...ext.pageDates, event.startDate]
    : ext.pageDates;
  const dateScoreOrNull = dateOverlapScore(event.startDate, event.endDate, augmentedDates, 6);
  const pageHasNoDates = dateScoreOrNull === null;
  const dateOverlap = dateScoreOrNull ?? 0;

  let positionAgreement: number;
  if (event.position === null) {
    positionAgreement = 0.7; // partial credit per spec
  } else if (ext.externalPosition === null) {
    positionAgreement = 0.5; // can't compare; weak partial credit
  } else if (ext.externalPosition === event.position) {
    positionAgreement = 1.0;
  } else {
    positionAgreement = 0;
  }

  // For WS-linked regatta websites, upgrade the tier weight regardless of
  // domain — WS is the linker, so we trust the link.
  const sourceTier =
    url === event.regattaWebsite ? tierScore("HIGH") : tierScore(tier);

  const breakdown: ConfidenceBreakdown = {
    nameMatch: nameMatchScore(`james juhasz`), // always 1.0 if extractor returned; gated below
    eventNameMatch,
    dateOverlap,
    classMatch: classMatchScore(ext.classDetection),
    positionAgreement,
    sourceTier,
  };
  return { breakdown, pageHasNoDates };
}

/**
 * Fetch a candidate URL through the extraction pipeline. Returns a partial
 * candidate (no confidenceScore yet — caller composes that from the extraction).
 */
type FetchedExtraction = {
  url: string;
  domain: string;
  contentType: ContentType;
  fetchedAt: string;
  externalPosition: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  classDetection: "match" | "mismatch" | "absent";
  pageDates: string[];
  pageTitle: string;
  ambiguous: boolean;
  imageOnly: boolean;
  notes: string[];
} | null;

async function extractOne(
  url: string,
  playwright: PlaywrightSession | null,
): Promise<FetchedExtraction> {
  const fetchedAt = nowIso();
  const result = await fetchUrl(url, { timeoutMs: 15_000 });
  if (!result.ok) {
    return null;
  }

  const domain = domainOf(result.finalUrl);

  if (isPdf(result.contentType, result.body)) {
    const ext = await extractFromPdf(result.body);
    return {
      url: result.finalUrl,
      domain,
      contentType: "pdf",
      fetchedAt,
      externalPosition: ext.externalPosition,
      totalCompetitors: ext.totalCompetitors,
      fleet: ext.fleet,
      classDetection: ext.classDetection,
      pageDates: ext.pageDates,
      pageTitle: ext.pageTitle,
      ambiguous: ext.ambiguous,
      imageOnly: ext.imageOnly,
      notes: ext.notes,
    };
  }

  // HTML path: try static parse first; if no row found AND playwright is
  // available, try rendered DOM (Manage2Sail-style SPAs).
  const text = bufferToText(result.body);
  const staticExt = extractFromHtml(text);
  if (staticExt.externalPosition !== null || !playwright) {
    return {
      url: result.finalUrl,
      domain,
      contentType: "html",
      fetchedAt,
      externalPosition: staticExt.externalPosition,
      totalCompetitors: staticExt.totalCompetitors,
      fleet: staticExt.fleet,
      classDetection: staticExt.classDetection,
      pageDates: staticExt.pageDates,
      pageTitle: staticExt.pageTitle,
      ambiguous: staticExt.ambiguous,
      imageOnly: false,
      notes: staticExt.notes,
    };
  }

  // Static parse failed AND playwright available — try rendered.
  const rendered = await playwright.fetchRendered(result.finalUrl);
  if (!rendered) {
    return {
      url: result.finalUrl,
      domain,
      contentType: "html",
      fetchedAt,
      externalPosition: null,
      totalCompetitors: null,
      fleet: null,
      classDetection: "absent",
      pageDates: staticExt.pageDates,
      pageTitle: staticExt.pageTitle,
      ambiguous: staticExt.ambiguous,
      imageOnly: false,
      notes: [...staticExt.notes, "playwright-render-failed"],
    };
  }
  const dynExt = extractFromHtml(rendered);
  return {
    url: result.finalUrl,
    domain,
    contentType: "playwright-html",
    fetchedAt,
    externalPosition: dynExt.externalPosition,
    totalCompetitors: dynExt.totalCompetitors,
    fleet: dynExt.fleet,
    classDetection: dynExt.classDetection,
    pageDates: dynExt.pageDates,
    pageTitle: dynExt.pageTitle,
    ambiguous: dynExt.ambiguous,
    imageOnly: false,
    notes: [...dynExt.notes, "via-playwright"],
  };
}

function buildCandidate(
  event: WSEventLite,
  ext: NonNullable<FetchedExtraction>,
): { candidate: ResultCandidate; bucket: "accept" | "review" | "reject"; reviewReasons: string[] } {
  const tier = tierForUrl(ext.url);
  const { breakdown, pageHasNoDates } = buildBreakdown(event, ext, ext.url);

  // Set nameMatch based on whether the extractor actually found a row.
  // No row found → nameMatch = 0 → hard reject.
  const nameMatchValue = ext.externalPosition !== null || ext.classDetection !== "mismatch"
    ? (ext.externalPosition !== null ? 1.0 : 0.0)
    : 0.0;
  breakdown.nameMatch = nameMatchValue;

  const score = computeScore({
    breakdown,
    multipleNameMatches: ext.ambiguous,
    pageHasNoDates,
  });

  const reviewReasons: string[] = [];
  if (event.position !== null && ext.externalPosition !== null && ext.externalPosition !== event.position) {
    reviewReasons.push("position-disagrees-with-ws");
  }
  if (breakdown.classMatch === 0.5) reviewReasons.push("class-implied-not-confirmed");
  if (pageHasNoDates) reviewReasons.push("page-has-no-dates");
  if (breakdown.sourceTier < 0.85) reviewReasons.push("low-tier-source");
  if (ext.imageOnly) reviewReasons.push("image-only-pdf");

  const candidate: ResultCandidate = {
    url: ext.url,
    domain: ext.domain,
    tier: ext.url === event.regattaWebsite ? "HIGH" : tier,
    contentType: ext.contentType,
    fetchedAt: ext.fetchedAt,
    confidenceScore: score.confidenceScore,
    confidenceBreakdown: breakdown,
    externalPosition: ext.externalPosition,
    totalCompetitors: ext.totalCompetitors,
    fleet: ext.fleet,
    rejectReason: score.hardReject ?? undefined,
    notes: ext.notes,
  };

  let bucket: "accept" | "review" | "reject";
  if (score.confidenceScore >= ACCEPT_THRESHOLD) bucket = "accept";
  else if (score.confidenceScore >= REVIEW_THRESHOLD) bucket = "review";
  else bucket = "reject";

  // Promotion: when we have unambiguous evidence — name row found in a
  // HIGH-tier source whose class detection is at least "absent" (not an
  // outright mismatch) — but the weighted score landed below the review
  // threshold solely because of positionAgreement=0 (WS disagreement) or
  // dateOverlap=0 (page lacks parseable dates), promote into review.
  // The user needs to see these so they can resolve the WS-vs-source
  // discrepancy manually rather than have them silently disappear into
  // rejected. We never auto-accept on promotion — only the bucket moves,
  // never the score.
  // Don't promote when the page has parseable dates that DON'T overlap the WS
  // event dates AND the position disagrees — that's the signature of a sailti
  // "latest results" URL serving a different year's data, not a row worth
  // reviewing. (`pageHasNoDates` is the legitimate ambiguous case.)
  const dateContradicts =
    !pageHasNoDates &&
    breakdown.dateOverlap === 0 &&
    event.position !== null &&
    ext.externalPosition !== null &&
    ext.externalPosition !== event.position;

  if (
    bucket === "reject" &&
    !score.hardReject &&
    !dateContradicts &&
    breakdown.nameMatch >= 0.95 &&
    breakdown.classMatch >= 0.5 &&
    breakdown.sourceTier >= 0.85 &&
    ext.externalPosition !== null
  ) {
    bucket = "review";
    if (!reviewReasons.includes("score-below-threshold-but-row-confirmed")) {
      reviewReasons.push("score-below-threshold-but-row-confirmed");
    }
  }

  return { candidate, bucket, reviewReasons };
}

async function processEvent(
  event: WSEventLite,
  playwright: PlaywrightSession | null,
): Promise<{
  bucket: "accept" | "review" | "reject";
  verified?: VerifiedResult;
  rejection?: { reason: RejectedEntry["reason"]; candidates: ResultCandidate[] };
}> {
  const discovered = await discoverCandidates(event);
  if (discovered.length === 0) {
    return {
      bucket: "reject",
      rejection: { reason: "no-page-found", candidates: [] },
    };
  }

  const candidates: ResultCandidate[] = [];
  let best: { candidate: ResultCandidate; reviewReasons: string[]; bucket: "accept" | "review" | "reject" } | null = null;

  // Sailti regatta sites (Sofia, Vilamoura, …) serve results through a JS SPA
  // where each class lives behind a class-filter UI (a <select> on Sofia, an
  // anchor on Vilamoura). The landing page rarely defaults to ILCA 7, so the
  // first extraction usually misses the row. When that happens we ask
  // playwright to switch class and emit the class-specific scoring.sailti.com
  // PDF URL, then feed that PDF into the existing PDF extraction path. We
  // can't reliably detect "this page is sailti-powered" from the URL alone
  // (Sofia's regattaWebsite is its own domain), so we trigger the resolver
  // post-hoc whenever a candidate fails to match a row.
  const queue: string[] = discovered.map((d) => d.url);
  const seen = new Set<string>();

  let playwrightCount = 0;
  while (queue.length > 0) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const ext = await extractOne(url, playwrightCount < MAX_PLAYWRIGHT_PER_EVENT ? playwright : null);
    if (!ext) continue;
    if (ext.contentType === "playwright-html") playwrightCount++;

    const { candidate, bucket, reviewReasons } = buildCandidate(event, ext);
    candidates.push(candidate);

    if (!best || candidate.confidenceScore > best.candidate.confidenceScore) {
      best = { candidate, reviewReasons, bucket };
    }

    // Early exit on accept-tier hit from a HIGH-tier source — nothing better
    // is going to come.
    if (bucket === "accept" && candidate.tier === "HIGH") break;

    // Sailti follow-up: a rendered HTML candidate that didn't match a row
    // might be a class-filter SPA showing the wrong class. Ask playwright to
    // resolve the class-specific PDF URL and enqueue it.
    const isRendered = ext.contentType === "playwright-html";
    const noRow = ext.externalPosition === null && (ext.notes ?? []).includes("no-row-matched");
    if (playwright && isRendered && noRow && playwrightCount < MAX_PLAYWRIGHT_PER_EVENT) {
      const pdfUrl = await playwright.resolveSailtiClassPdfUrl(url, event.className);
      if (pdfUrl && !seen.has(pdfUrl) && !queue.includes(pdfUrl)) {
        queue.push(pdfUrl);
      }
    }
  }

  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const top = candidates.slice(0, 3);

  if (!best || best.bucket === "reject") {
    let reason: RejectedEntry["reason"];
    if (candidates.length === 0) reason = "extraction-failed";
    else if (candidates.some((c) => c.rejectReason === "ambiguous-multiple-matches")) reason = "ambiguous-multiple-matches";
    else if (candidates.some((c) => c.rejectReason === "class-mismatch")) reason = "class-mismatch";
    else if (candidates.every((c) => c.notes?.includes("pdfjs-returned-no-text-items") || c.notes?.includes("suspiciously-low-text-density"))) reason = "image-only-pdf";
    else reason = "low-confidence";

    // Hard reject only when we never produced any candidate (no pages found,
    // every fetch errored). Anything with a parsed candidate — even if its
    // score landed below the review threshold — surfaces in the review pile
    // so a human can adjudicate alongside the confidence breakdown.
    if (candidates.length === 0) {
      return { bucket: "reject", rejection: { reason, candidates: [] } };
    }

    const topCand = top[0];
    const reviewReasons: string[] = [`below-review-threshold:${reason}`];
    if (topCand.rejectReason) reviewReasons.push(topCand.rejectReason);
    if (topCand.confidenceBreakdown.classMatch === 0.5) reviewReasons.push("class-implied-not-confirmed");
    if (topCand.confidenceBreakdown.sourceTier < 0.85) reviewReasons.push("low-tier-source");

    const synthetic: VerifiedResult = {
      worldSailingEventId: event.worldSailingEventId,
      verifiedAt: nowIso(),
      confidenceScore: topCand.confidenceScore,
      confidenceBreakdown: topCand.confidenceBreakdown,
      primarySource: {
        url: topCand.url,
        domain: topCand.domain,
        tier: topCand.tier,
        fetchedAt: topCand.fetchedAt,
        contentType: topCand.contentType,
      },
      externalPosition: topCand.externalPosition,
      totalCompetitors: topCand.totalCompetitors,
      fleet: topCand.fleet,
      candidates: top,
      needsReview: true,
      reviewReasons: Array.from(new Set(reviewReasons)),
    };
    return { bucket: "review", verified: synthetic };
  }

  const verified: VerifiedResult = {
    worldSailingEventId: event.worldSailingEventId,
    verifiedAt: nowIso(),
    confidenceScore: best.candidate.confidenceScore,
    confidenceBreakdown: best.candidate.confidenceBreakdown,
    primarySource: {
      url: best.candidate.url,
      domain: best.candidate.domain,
      tier: best.candidate.tier,
      fetchedAt: best.candidate.fetchedAt,
      contentType: best.candidate.contentType,
    },
    externalPosition: best.candidate.externalPosition,
    totalCompetitors: best.candidate.totalCompetitors,
    fleet: best.candidate.fleet,
    candidates: top,
    needsReview: best.bucket === "review",
    reviewReasons: best.reviewReasons,
  };

  return { bucket: best.bucket, verified };
}

async function main() {
  const wsDump = await readJson<WSDump | null>(WS_FILE, null);
  if (!wsDump) {
    console.error(`[verify-results] missing ${path.relative(PROJECT_ROOT, WS_FILE)} — run 'npm run ws:fetch' first.`);
    process.exit(1);
  }

  const ilca7Events = wsDump.events.filter((e) => TARGET_CLASS_CODES.has(e.classCode));
  console.log(`[verify-results] ${ilca7Events.length} ILCA 7 events in WS dump.`);

  // Load the human-approved trust store. Domains the reviewer has approved
  // multiple times start at a higher source tier this run.
  LEARNING_INDEX = await loadLearnedTrustIndex();
  if (LEARNING_INDEX.size > 0) {
    console.log(
      `[verify-results] applying learned trust to ${LEARNING_INDEX.size} domain(s).`,
    );
  }

  const prevVerified = await readJson<ResultsVerifiedFile>(VERIFIED_FILE, { generatedAt: "", results: [] });
  const prevReview = await readJson<ResultsReviewFile>(REVIEW_FILE, { generatedAt: "", results: [] });
  const prevRejected = await readJson<ResultsRejectedFile>(REJECTED_FILE, { generatedAt: "", entries: [] });

  const prevVerifiedById = new Map(prevVerified.results.map((r) => [r.worldSailingEventId, r]));
  const prevReviewById = new Map(prevReview.results.map((r) => [r.worldSailingEventId, r]));
  const prevRejectedById = new Map(prevRejected.entries.map((e) => [e.worldSailingEventId, e]));

  const filtered = ARGS.eventFilter
    ? ilca7Events.filter((e) => e.worldSailingEventId === ARGS.eventFilter)
    : ilca7Events;

  // Decide which events to process this run.
  // - Accepted/review entries: re-verify if WS data changed since lastVerified.
  // - Rejected entries: respect retry backoff unless --force.
  // - Unseen events: always process.
  const queue: WSEventLite[] = [];
  for (const ev of filtered) {
    const verified = prevVerifiedById.get(ev.worldSailingEventId);
    const review = prevReviewById.get(ev.worldSailingEventId);
    const rejected = prevRejectedById.get(ev.worldSailingEventId);

    if (rejected && !verified && !review) {
      if (isReadyForRetry(rejected, ARGS.force)) queue.push(ev);
      continue;
    }
    if (verified && !ARGS.force) continue; // already accepted; only redo on --force
    if (review && !ARGS.force) continue;   // already in review; only redo on --force
    queue.push(ev);
  }

  const toProcess = queue.slice(0, ARGS.limit);
  console.log(`[verify-results] processing ${toProcess.length} of ${queue.length} ready events.`);

  let playwright: PlaywrightSession | null = null;
  // Lazy-launch playwright on first need to keep --dry on a fresh checkout fast.
  let playwrightLaunched = false;
  const ensurePlaywright = async (): Promise<PlaywrightSession | null> => {
    if (playwrightLaunched) return playwright;
    playwrightLaunched = true;
    try {
      playwright = await launchPlaywrightSession();
      return playwright;
    } catch (err) {
      console.warn(`[verify-results] playwright launch failed: ${(err as Error).message} — JS-rendered pages will be skipped.`);
      return null;
    }
  };

  const verifiedNew = new Map(prevVerifiedById);
  const reviewNew = new Map(prevReviewById);
  const rejectedNew = new Map(prevRejectedById);

  // One-shot migration: any historical rejected entry that has at least one
  // parsed candidate gets surfaced as a review item with the top candidate's
  // confidence score. Only entries with truly zero candidates remain in the
  // rejected file. Idempotent — safe to run on every invocation.
  // Exception: entries the reviewer explicitly rejected (reason "human-rejected")
  // stay in rejected forever — promoting them back would re-queue work the human
  // already adjudicated.
  for (const [id, entry] of Array.from(rejectedNew.entries())) {
    if (entry.candidates.length === 0) continue;
    if (entry.reason === "human-rejected") continue;
    if (verifiedNew.has(id) || reviewNew.has(id)) {
      rejectedNew.delete(id);
      continue;
    }
    const topCand = [...entry.candidates].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
    const reviewReasons: string[] = [`below-review-threshold:${entry.reason}`];
    if (topCand.rejectReason) reviewReasons.push(topCand.rejectReason);
    if (topCand.confidenceBreakdown.classMatch === 0.5) reviewReasons.push("class-implied-not-confirmed");
    if (topCand.confidenceBreakdown.sourceTier < 0.85) reviewReasons.push("low-tier-source");

    const synthetic: VerifiedResult = {
      worldSailingEventId: id,
      verifiedAt: entry.lastAttemptAt,
      confidenceScore: topCand.confidenceScore,
      confidenceBreakdown: topCand.confidenceBreakdown,
      primarySource: {
        url: topCand.url,
        domain: topCand.domain,
        tier: topCand.tier,
        fetchedAt: topCand.fetchedAt,
        contentType: topCand.contentType,
      },
      externalPosition: topCand.externalPosition,
      totalCompetitors: topCand.totalCompetitors,
      fleet: topCand.fleet,
      candidates: entry.candidates.slice(0, 3),
      needsReview: true,
      reviewReasons: Array.from(new Set(reviewReasons)),
    };
    reviewNew.set(id, synthetic);
    rejectedNew.delete(id);
  }

  for (const ev of toProcess) {
    process.stdout.write(`  · ${ev.startDate}  ${ev.regattaName} … `);
    const pw = await ensurePlaywright();
    const outcome = await processEvent(ev, pw);

    if (outcome.bucket === "accept" && outcome.verified) {
      verifiedNew.set(ev.worldSailingEventId, outcome.verified);
      reviewNew.delete(ev.worldSailingEventId);
      rejectedNew.delete(ev.worldSailingEventId);
      console.log(
        `accept (${outcome.verified.confidenceScore.toFixed(2)}) ${outcome.verified.primarySource.domain}`,
      );
    } else if (outcome.bucket === "review" && outcome.verified) {
      reviewNew.set(ev.worldSailingEventId, outcome.verified);
      verifiedNew.delete(ev.worldSailingEventId);
      rejectedNew.delete(ev.worldSailingEventId);
      console.log(
        `review (${outcome.verified.confidenceScore.toFixed(2)}) [${outcome.verified.reviewReasons.join(",")}]`,
      );
    } else if (outcome.bucket === "reject" && outcome.rejection) {
      const prev = rejectedNew.get(ev.worldSailingEventId);
      const attemptCount = (prev?.attemptCount ?? 0) + 1;
      rejectedNew.set(ev.worldSailingEventId, {
        worldSailingEventId: ev.worldSailingEventId,
        reason: outcome.rejection.reason,
        attemptCount,
        lastAttemptAt: nowIso(),
        nextRetryAt: nextRetryAt(attemptCount),
        candidates: outcome.rejection.candidates,
      });
      verifiedNew.delete(ev.worldSailingEventId);
      reviewNew.delete(ev.worldSailingEventId);
      console.log(`reject (${outcome.rejection.reason}, attempt ${attemptCount})`);
    }
  }

  await (playwright as PlaywrightSession | null)?.close().catch(() => {});

  const verifiedFile: ResultsVerifiedFile = {
    generatedAt: nowIso(),
    results: Array.from(verifiedNew.values()).sort((a, b) =>
      a.worldSailingEventId.localeCompare(b.worldSailingEventId),
    ),
  };
  const reviewFile: ResultsReviewFile = {
    generatedAt: nowIso(),
    results: Array.from(reviewNew.values()).sort((a, b) =>
      a.worldSailingEventId.localeCompare(b.worldSailingEventId),
    ),
  };
  const rejectedFile: ResultsRejectedFile = {
    generatedAt: nowIso(),
    entries: Array.from(rejectedNew.values()).sort((a, b) =>
      a.worldSailingEventId.localeCompare(b.worldSailingEventId),
    ),
  };

  console.log(
    `[verify-results] verified ${verifiedFile.results.length} | review ${reviewFile.results.length} | rejected ${rejectedFile.entries.length}`,
  );

  if (ARGS.dry) {
    console.log("[verify-results] --dry: not writing.");
    return;
  }

  await writeJson(VERIFIED_FILE, verifiedFile);
  await writeJson(REVIEW_FILE, reviewFile);
  await writeJson(REJECTED_FILE, rejectedFile);
  console.log(`[verify-results] wrote 3 files to ${path.relative(PROJECT_ROOT, DATA_DIR)}/`);
}

main().catch((err) => {
  console.error("[verify-results] failed:", err);
  process.exit(1);
});
