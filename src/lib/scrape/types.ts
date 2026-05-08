/*
  src/lib/scrape/types.ts
  ---------------------------------------------------------------------------
  Shared types for the results verification pipeline. The pipeline's contract:
  given a World Sailing event (federation-authoritative), discover the official
  external results page, parse it, and emit a confidence-scored verification.

  We never overwrite WS data — external sources are evidence, not authority.
*/

export type SourceTier = "HIGH" | "MEDIUM" | "LOW";

export type ContentType = "html" | "pdf" | "playwright-html";

/** Per-component confidence; each is 0..1. */
export type ConfidenceBreakdown = {
  /** Fuzzy match against "James Juhasz" with diacritic strip. */
  nameMatch: number;
  /** Normalized title vs WS regattaName / eventName. */
  eventNameMatch: number;
  /** 1.0 if any date on the page overlaps WS [start..end] ±6d, else scaled or 0. */
  dateOverlap: number;
  /** 1.0 if ILCA 7 confirmed; 0 if mismatch (ILCA 6 / Masters / etc.); 0.5 if absent but implied. */
  classMatch: number;
  /** 1.0 if external position == WS position; 0 if disagree; 0.7 if WS has none. */
  positionAgreement: number;
  /** HIGH=1.0, MEDIUM=0.85, LOW=0.6. */
  sourceTier: number;
};

/**
 * A single attempt at extracting a result from one URL. May be the winner,
 * a runner-up (kept for transparency), or a rejected candidate.
 */
export type ResultCandidate = {
  url: string;
  domain: string;
  tier: SourceTier;
  contentType: ContentType;
  fetchedAt: string;
  /** 0..1 raw score before hard-reject veto. */
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  /** Extracted finishing position; null if extraction failed. */
  externalPosition: number | null;
  /** Number of competitors in the ILCA 7 fleet. */
  totalCompetitors: number | null;
  /** Verbatim fleet/section label seen on the page. */
  fleet: string | null;
  /** Reason this candidate was rejected, if any. */
  rejectReason?: string;
  /** Free-form notes for debugging (e.g., "found ILCA 7 section header at y=312"). */
  notes?: string[];
};

/** Final, accepted enrichment for a single WS event. */
export type VerifiedResult = {
  worldSailingEventId: string;
  verifiedAt: string;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  primarySource: {
    url: string;
    domain: string;
    tier: SourceTier;
    fetchedAt: string;
    contentType: ContentType;
  };
  externalPosition: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  /** Up to 3 candidates including non-winners, for transparency. */
  candidates: ResultCandidate[];
  /** True iff 0.70 ≤ score < 0.90. */
  needsReview: boolean;
  /** Machine-readable flags: ["position-disagrees-with-ws", ...] */
  reviewReasons: string[];
  /**
   * Human-set override: when true, the public results card uses
   * `externalPosition` instead of the federation's `row.position` for this
   * one entry. Used for the rare case where WS itself recorded the wrong
   * position (e.g. 2016 Cork OCR — WS says 22 but the cork.org final
   * standings show 12 of 17). Defaults to false; the federation remains
   * canonical for everything else.
   */
  overrideWsPosition?: boolean;
};

/** Entry stored in results-rejected.json for retry scheduling. */
export type RejectedEntry = {
  worldSailingEventId: string;
  reason:
    | "no-page-found"
    | "low-confidence"
    | "ambiguous-multiple-matches"
    | "class-mismatch"
    | "extraction-failed"
    | "image-only-pdf"
    /** Reviewer clicked Reject in the admin queue. Permanent — never auto-retried, never promoted back to review. */
    | "human-rejected";
  attemptCount: number;
  lastAttemptAt: string;
  /** ISO; null = give up. */
  nextRetryAt: string | null;
  candidates: ResultCandidate[];
};

/** Full state file written each run. */
export type ResultsVerifiedFile = {
  generatedAt: string;
  results: VerifiedResult[];
};

export type ResultsReviewFile = {
  generatedAt: string;
  results: VerifiedResult[];
};

export type ResultsRejectedFile = {
  generatedAt: string;
  entries: RejectedEntry[];
};

/** Subset of WSEventRow we need; imported types live in scripts/fetch-world-sailing.ts. */
export type WSEventLite = {
  worldSailingEventId: string;
  worldSailingRegattaCode: string | null;
  regattaName: string;
  startDate: string;
  endDate: string;
  position: number | null;
  className: string;
  classCode: string;
  eventName: string | null;
  regattaWebsite: string | null;
  sailNumber: string | null;
};

/** Discovered URL with provenance, fed to the extraction layer. */
export type DiscoveredUrl = {
  url: string;
  /** Where this URL came from — for logging and tier weighting. */
  source: "ws-regatta-website" | "manage2sail-derived" | "brave-search" | "sailti-class-pdf" | "adapter";
};
