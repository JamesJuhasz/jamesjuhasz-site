/*
  src/lib/scrape/score.ts
  ---------------------------------------------------------------------------
  Composes a ConfidenceBreakdown into a single confidenceScore.

  Weights are tuned so any single-factor failure (e.g., classMatch=0) caps the
  total below the 0.90 accept threshold. Hard rejects force the score to 0
  regardless of the weighted sum, so we never accept on a math fluke.
*/

import type { ConfidenceBreakdown } from "./types";

/**
 * Component weights. Sum = 1.0.
 *
 *   nameMatch          0.20  ← ambiguous match → automatic 0
 *   eventNameMatch     0.15
 *   dateOverlap        0.20  ← biggest single ground-truth signal
 *   classMatch         0.20  ← veto-style: 0 caps total ≤ 0.80
 *   positionAgreement  0.15
 *   sourceTier         0.10
 *
 * Why this shape: with weights ≤ 0.20 each, no single full-credit component
 * can lift a partial score across the 0.90 threshold on its own. Two failures
 * (e.g., class=0 + date=0) cap at 0.60 → review queue.
 */
export const WEIGHTS: Record<keyof ConfidenceBreakdown, number> = {
  nameMatch: 0.20,
  eventNameMatch: 0.15,
  dateOverlap: 0.20,
  classMatch: 0.20,
  positionAgreement: 0.15,
  sourceTier: 0.10,
};

export const ACCEPT_THRESHOLD = 0.90;
export const REVIEW_THRESHOLD = 0.70;

/** Hard reject conditions: when any of these are true, the score is forced to 0. */
export type HardRejectReason =
  | "name-not-found"
  | "class-mismatch"
  | "date-mismatch-without-strong-name-class-event"
  | "ambiguous-multiple-matches";

export type ScoreInput = {
  breakdown: ConfidenceBreakdown;
  /** True if the page has > 1 distinct rows matching "James Juhasz". */
  multipleNameMatches: boolean;
  /** True if the page provided NO date that could be extracted. */
  pageHasNoDates: boolean;
};

export type ScoreResult = {
  confidenceScore: number;
  hardReject: HardRejectReason | null;
  weightedSum: number;
};

export function computeScore(input: ScoreInput): ScoreResult {
  const { breakdown, multipleNameMatches, pageHasNoDates } = input;

  const weightedSum = (Object.keys(WEIGHTS) as Array<keyof ConfidenceBreakdown>)
    .reduce((acc, k) => acc + breakdown[k] * WEIGHTS[k], 0);

  // Hard reject: name not found at all.
  if (breakdown.nameMatch === 0) {
    return { confidenceScore: 0, hardReject: "name-not-found", weightedSum };
  }

  // Hard reject: ambiguous (page has multiple "James Juhasz" rows).
  if (multipleNameMatches) {
    return { confidenceScore: 0, hardReject: "ambiguous-multiple-matches", weightedSum };
  }

  // Hard reject: explicit class mismatch (page is ILCA 6, Masters, etc.).
  if (breakdown.classMatch === 0) {
    return { confidenceScore: 0, hardReject: "class-mismatch", weightedSum };
  }

  // Hard reject: dates given but none overlap, AND we don't have the
  // strong-trio override (name + event + class all ≥ 0.95).
  // Note: pageHasNoDates is the "no dates extracted" path — different from
  // "dates extracted but all out of band" (dateOverlap === 0 here).
  //
  // Second escape hatch: HIGH-tier domain with a confirmed name row and
  // plausible (or confirmed) fleet. The federation-trusted result archive
  // (cork.org, ilca-worlds.org, …) hosting a row with the right name in a
  // ILCA-7-or-Standard fleet is strong enough evidence to enter review,
  // even if the page's own date stamps don't line up with the WS window.
  // This catches multi-event archive files where the page-level date
  // header is the wrong sub-event (e.g. WS marked OCR but James actually
  // raced Fall on the same site that year).
  if (breakdown.dateOverlap === 0 && !pageHasNoDates) {
    const strongTrio =
      breakdown.nameMatch >= 0.95 &&
      breakdown.eventNameMatch >= 0.95 &&
      breakdown.classMatch >= 0.95;
    const highTierWithNameAndClass =
      breakdown.nameMatch >= 0.95 &&
      breakdown.classMatch >= 0.5 &&
      breakdown.sourceTier >= 1.0;
    // Scoring-platform PDFs (sailti, manage2sail, sailwave) often lack
    // event-title text and copyright dates that line up with the WS window
    // — they're scoring exports, not editorial pages. When the platform
    // confirms ILCA 7 in its own class header AND the row's name matches,
    // that's strong enough for review-bucket evidence.
    const scoringExportWithClassConfirmed =
      breakdown.nameMatch >= 0.95 &&
      breakdown.classMatch >= 1.0 &&
      breakdown.sourceTier >= 0.85;
    if (!strongTrio && !highTierWithNameAndClass && !scoringExportWithClassConfirmed) {
      return {
        confidenceScore: 0,
        hardReject: "date-mismatch-without-strong-name-class-event",
        weightedSum,
      };
    }
  }

  return { confidenceScore: weightedSum, hardReject: null, weightedSum };
}

/** Bucket a score into accept / review / reject. */
export function bucket(score: number): "accept" | "review" | "reject" {
  if (score >= ACCEPT_THRESHOLD) return "accept";
  if (score >= REVIEW_THRESHOLD) return "review";
  return "reject";
}
