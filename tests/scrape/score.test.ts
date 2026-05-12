import { describe, expect, it } from "vitest";
import {
  ACCEPT_THRESHOLD,
  REVIEW_THRESHOLD,
  bucket,
  computeScore,
} from "../../src/lib/scrape/score";
import type { ConfidenceBreakdown } from "../../src/lib/scrape/types";

const FULL: ConfidenceBreakdown = {
  nameMatch: 1,
  eventNameMatch: 1,
  dateOverlap: 1,
  classMatch: 1,
  positionAgreement: 1,
  sourceTier: 1,
};

describe("computeScore — full credit path", () => {
  it("all components 1.0 → score = 1.0", () => {
    const r = computeScore({ breakdown: FULL, multipleNameMatches: false, pageHasNoDates: false });
    expect(r.confidenceScore).toBeCloseTo(1, 5);
    expect(r.hardReject).toBeNull();
  });
});

describe("computeScore — hard rejects", () => {
  it("name=0 → hard reject", () => {
    const r = computeScore({
      breakdown: { ...FULL, nameMatch: 0 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    expect(r.confidenceScore).toBe(0);
    expect(r.hardReject).toBe("name-not-found");
  });

  it("class=0 (ILCA 6 page) → hard reject even with everything else 1.0", () => {
    const r = computeScore({
      breakdown: { ...FULL, classMatch: 0 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    expect(r.confidenceScore).toBe(0);
    expect(r.hardReject).toBe("class-mismatch");
  });

  it("ambiguous page → hard reject", () => {
    const r = computeScore({
      breakdown: FULL,
      multipleNameMatches: true,
      pageHasNoDates: false,
    });
    expect(r.confidenceScore).toBe(0);
    expect(r.hardReject).toBe("ambiguous-multiple-matches");
  });

  it("date=0 with extracted dates and weak trio → hard reject", () => {
    // nameMatch < 0.95 defeats all three escape hatches (strongTrio,
    // highTierWithNameAndClass, scoringExportWithClassConfirmed all gate on
    // nameMatch ≥ 0.95), so the hard reject fires.
    const r = computeScore({
      breakdown: { ...FULL, nameMatch: 0.7, eventNameMatch: 0.7, dateOverlap: 0 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    expect(r.confidenceScore).toBe(0);
    expect(r.hardReject).toBe("date-mismatch-without-strong-name-class-event");
  });

  it("date=0 with strong trio → no hard reject (still loses date weight)", () => {
    const r = computeScore({
      breakdown: { ...FULL, dateOverlap: 0 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    expect(r.hardReject).toBeNull();
    // 1 - 0.20 (date weight) = 0.80, below 0.90 → review queue
    expect(r.confidenceScore).toBeCloseTo(0.8, 5);
  });

  it("pageHasNoDates with date=0 → no hard reject (missing dates allowed)", () => {
    const r = computeScore({
      breakdown: { ...FULL, dateOverlap: 0 },
      multipleNameMatches: false,
      pageHasNoDates: true,
    });
    expect(r.hardReject).toBeNull();
  });
});

describe("computeScore — single-component failure caps below accept", () => {
  it("class=0 caps at 0 (hard reject); even non-veto class=0.5 keeps total under 0.90", () => {
    const r = computeScore({
      breakdown: { ...FULL, classMatch: 0.5 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    // 1 - 0.20 + (0.5 * 0.20) = 0.90
    expect(r.confidenceScore).toBeCloseTo(0.9, 5);
  });
});

describe("bucket", () => {
  it("≥ 0.90 → accept", () => expect(bucket(0.91)).toBe("accept"));
  it("0.70..0.89 → review", () => expect(bucket(0.85)).toBe("review"));
  it("< 0.70 → reject", () => expect(bucket(0.5)).toBe("reject"));
  it("threshold edges", () => {
    expect(bucket(ACCEPT_THRESHOLD)).toBe("accept");
    expect(bucket(REVIEW_THRESHOLD)).toBe("review");
    expect(bucket(REVIEW_THRESHOLD - 0.01)).toBe("reject");
  });
});

describe("computeScore — position agreement scenarios", () => {
  it("WS has no position → partial credit 0.7", () => {
    const r = computeScore({
      breakdown: { ...FULL, positionAgreement: 0.7 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    // 1 - 0.15 + 0.7*0.15 = 0.955 → still accepts
    expect(r.confidenceScore).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it("position disagrees → drops below accept", () => {
    const r = computeScore({
      breakdown: { ...FULL, positionAgreement: 0 },
      multipleNameMatches: false,
      pageHasNoDates: false,
    });
    // 1 - 0.15 = 0.85 → review queue
    expect(r.confidenceScore).toBeCloseTo(0.85, 5);
    expect(bucket(r.confidenceScore)).toBe("review");
  });
});
