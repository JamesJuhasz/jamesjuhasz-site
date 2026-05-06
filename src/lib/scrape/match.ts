/*
  src/lib/scrape/match.ts
  ---------------------------------------------------------------------------
  Pure matching primitives: name match, event-name similarity, date overlap,
  class detection. Each returns a 0..1 confidence component (or a simple
  boolean for class detection — the caller maps to a score).

  No I/O. No globals. Fully unit-testable.
*/

import { diceSimilarity, normalizeForMatch, tokens } from "./normalize";

export const TARGET_NAME = "James Juhasz";
export const TARGET_TOKENS = ["james", "juhasz"] as const;

/**
 * Name match against "James Juhasz".
 *
 * Returns 1.0 only if both tokens appear as whole tokens (after diacritic
 * strip + lowercasing). Returns 0 otherwise. We deliberately do NOT do
 * partial-match credit — substring matches like "juhasz" inside another word
 * are too risky for a no-guess pipeline.
 *
 * Accepts orderings:
 *   "James Juhasz" / "Juhász, James" / "Juhasz James" / "JUHASZ James (CAN)"
 */
export function nameMatchScore(candidate: string): number {
  const t = tokens(candidate);
  return TARGET_TOKENS.every((needed) => t.has(needed)) ? 1.0 : 0.0;
}

/**
 * Page-level ambiguity check: how many distinct rows match the name?
 *
 * Each input string is one row's normalized text. If two rows match but they
 * appear to be the same person on the same line repeated (e.g., a page-wide
 * "James Juhasz" header echoed in a sidebar), we don't want to flag ambiguity
 * — but distinguishing that from genuinely-different rows is hard, so we
 * keep this strict: any > 1 matching rows = ambiguous.
 */
export function countNameMatches(rows: string[]): number {
  return rows.filter((r) => nameMatchScore(r) === 1.0).length;
}

/**
 * Event-name similarity via Sørensen–Dice on character bigrams.
 *
 * Matches the regatta name from World Sailing against the title or heading
 * extracted from the candidate page. A small set of stop-tokens is removed
 * before scoring so that "Trofeo S.A.R Princesa Sofia" and "Trofeo Princesa
 * Sofia 2026" still align well.
 */
export function eventNameSimilarity(wsName: string, pageName: string): number {
  const stopTokens = /\b(the|de|of|a|an|trophy|trofeo|cup|regatta|championship|championships|grand|prix|round|sailing|class|event|edition|2024|2025|2026|2027)\b/gi;
  const norm = (s: string) =>
    normalizeForMatch(s)
      .replace(/[.,'"()\-_/]/g, " ")
      .replace(stopTokens, " ")
      .replace(/\s+/g, " ")
      .trim();

  const wsClean = norm(wsName);
  const pgClean = norm(pageName);
  if (!wsClean || !pgClean) return 0;

  // Direct substring hit (in either direction) is full credit.
  if (pgClean.includes(wsClean) || wsClean.includes(pgClean)) return 1.0;

  return diceSimilarity(wsClean, pgClean);
}

/**
 * Date overlap between WS event window [wsStart..wsEnd] and a date or window
 * extracted from the page.
 *
 * Returns 1.0 if any page-date is within ±toleranceDays of the WS window;
 * a linear taper from 1.0 down to 0 across the tolerance band; 0 outside.
 *
 * If the page has no dates, return null — the caller decides whether to
 * apply the "missing-date allowed" exception.
 */
export function dateOverlapScore(
  wsStart: string,
  wsEnd: string,
  pageDates: string[],
  toleranceDays = 6,
): number | null {
  if (pageDates.length === 0) return null;

  const start = Date.parse(`${wsStart}T00:00:00Z`);
  const end = Date.parse(`${wsEnd}T23:59:59Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  let bestScore = 0;
  for (const d of pageDates) {
    const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d);
    if (Number.isNaN(t)) continue;

    let distanceDays: number;
    if (t >= start && t <= end) {
      distanceDays = 0;
    } else if (t < start) {
      distanceDays = (start - t) / 86_400_000;
    } else {
      distanceDays = (t - end) / 86_400_000;
    }

    if (distanceDays > toleranceDays) continue;
    const score = 1 - distanceDays / toleranceDays;
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/**
 * Class detection result.
 *
 * - "match"     → ILCA 7 / Laser Standard / Standard Men confirmed.
 * - "mismatch"  → page is explicitly a different class/division.
 * - "absent"    → no class hints found; caller awards partial credit if the
 *                 surrounding WS event is unambiguously ILCA 7.
 */
export type ClassDetection = "match" | "mismatch" | "absent";

const POSITIVE_CLASS_PATTERNS = [
  /\bilca\s*7\b/i,
  /\bilca\s*standard\b/i,
  /\blaser\s*standard\b/i,
  /\bstandard\s*men\b/i,
  /\bilca\s*men\b/i,
  /\bmen'?s?\s+one\s+person\s+dinghy\s+heavyweight\b/i,
];

const NEGATIVE_CLASS_PATTERNS = [
  /\bilca\s*6\b/i,
  /\bilca\s*4\b/i,
  /\blaser\s*radial\b/i,
  /\bilca\s*4\.7\b/i,
  /\b4\.7\b/i,
  /\bwomen'?s?\b/i,
  /\bgirls?\b/i,
  /\bladies\b/i,
  /\bu21\b/i,
  /\bu19\b/i,
  /\bu17\b/i,
  /\byouth\b/i,
  /\bjunior\b/i,
  /\bapprentice\b/i,
  /\bgreat\s+grand\s*master\b/i,
  /\bgrand\s*master\b/i,
  /\bmasters?\b/i,
];

/**
 * Detect ILCA 7 (Senior Men) class on a page.
 *
 * The signal is positive-only at the section level: a positive header anywhere
 * is considered "match" UNLESS a negative term appears closer to the table of
 * interest — but at this layer we don't know which table the caller cares
 * about. So:
 *
 *   - any positive AND no negative   → "match"
 *   - any positive AND any negative  → "match" (mixed-fleet doc; extraction
 *                                      layer is responsible for cropping to
 *                                      the ILCA 7 section)
 *   - no positive AND any negative   → "mismatch"
 *   - neither                        → "absent"
 *
 * For PDF/HTML extraction the caller is expected to scope text to the relevant
 * section; classify(text) on that scoped text gives a sharper answer.
 */
export function classify(text: string): ClassDetection {
  const hasPositive = POSITIVE_CLASS_PATTERNS.some((p) => p.test(text));
  const hasNegative = NEGATIVE_CLASS_PATTERNS.some((p) => p.test(text));
  if (hasPositive) return "match";
  if (hasNegative) return "mismatch";
  return "absent";
}

/** Map a ClassDetection to the 0..1 score component. */
export function classMatchScore(d: ClassDetection): number {
  switch (d) {
    case "match":
      return 1.0;
    case "mismatch":
      return 0.0;
    case "absent":
      return 0.5;
  }
}

/**
 * Extract candidate ISO dates from arbitrary page text.
 *
 * Recognizes:
 *   - "2026-04-25"
 *   - "25/04/2026", "25.04.2026", "25-04-2026" (day-first European; common in regatta PDFs)
 *   - "April 25, 2026" / "25 April 2026" / "25 Apr 2026"
 *
 * Returns ISO YYYY-MM-DD strings. Best-effort; ambiguous tokens (e.g., a bare
 * "2026") are dropped. Order is preserved; duplicates removed.
 */
export function extractDates(text: string): string[] {
  const out = new Set<string>();
  const months: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  // ISO: 2026-04-25
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const [, y, mo, d] = m;
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      out.add(`${y}-${mo}-${d}`);
    }
  }

  // Day-first: 25/04/2026, 25-04-2026, 25.04.2026
  for (const m of text.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g)) {
    const [, d, mo, y] = m;
    const mn = Number(mo);
    const dn = Number(d);
    // Heuristic: if first number > 12 it's a day; else assume DMY (European
    // regatta convention). US MDY is uncommon for ILCA events at James's level.
    if (mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
      out.add(`${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`);
    }
  }

  // "25 April 2026" / "April 25, 2026" / "25 Apr 2026"
  const monthsRe = Object.keys(months).join("|");
  const dmRe = new RegExp(`\\b(\\d{1,2})\\s+(${monthsRe})\\s+(\\d{4})\\b`, "gi");
  const mdRe = new RegExp(`\\b(${monthsRe})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "gi");
  for (const m of text.matchAll(dmRe)) {
    const [, d, mo, y] = m;
    out.add(`${y}-${months[mo.toLowerCase()]}-${String(Number(d)).padStart(2, "0")}`);
  }
  for (const m of text.matchAll(mdRe)) {
    const [, mo, d, y] = m;
    out.add(`${y}-${months[mo.toLowerCase()]}-${String(Number(d)).padStart(2, "0")}`);
  }

  return Array.from(out);
}
