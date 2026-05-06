import { describe, expect, it } from "vitest";
import {
  classMatchScore,
  classify,
  countNameMatches,
  dateOverlapScore,
  eventNameSimilarity,
  extractDates,
  nameMatchScore,
} from "../../src/lib/scrape/match";

describe("nameMatchScore", () => {
  it("matches direct order", () => {
    expect(nameMatchScore("James Juhasz")).toBe(1);
  });
  it("matches comma-flipped with diacritic", () => {
    expect(nameMatchScore("Juhász, James")).toBe(1);
  });
  it("matches all-caps with country tag", () => {
    expect(nameMatchScore("JUHASZ James (CAN)")).toBe(1);
  });
  it("matches embedded in row text", () => {
    expect(nameMatchScore("12 17 James Juhasz CAN 1234 5 6 7 — 12.0 12.0")).toBe(1);
  });
  it("rejects partial — only first name", () => {
    expect(nameMatchScore("James Smith")).toBe(0);
  });
  it("rejects partial — only last name", () => {
    expect(nameMatchScore("Bence Juhasz")).toBe(0);
  });
  it("rejects substring noise — 'juhaszification' is one token, not 'juhasz'", () => {
    expect(nameMatchScore("james juhaszification of something else")).toBe(0);
  });
});

describe("countNameMatches", () => {
  it("counts only full matches", () => {
    expect(
      countNameMatches([
        "1 James Juhasz CAN",
        "2 Bence Juhasz HUN",
        "3 James Juhász CAN", // diacritic, still matches
      ]),
    ).toBe(2);
  });
});

describe("eventNameSimilarity", () => {
  it("ws name substring of page name → 1.0", () => {
    expect(eventNameSimilarity("Trofeo Princesa Sofia", "53rd Trofeo Princesa Sofia 2026")).toBe(1);
  });
  it("noisy WS name vs cleaned page name → high", () => {
    expect(
      eventNameSimilarity("Trofeo S.A.R Princesa Sofia", "Trofeo Princesa Sofia"),
    ).toBeGreaterThan(0.85);
  });
  it("totally different events → low", () => {
    expect(eventNameSimilarity("Trofeo Princesa Sofia", "Kieler Woche")).toBeLessThan(0.3);
  });
});

describe("dateOverlapScore", () => {
  it("page date inside WS window → 1.0", () => {
    expect(dateOverlapScore("2026-04-18", "2026-04-25", ["2026-04-22"])).toBe(1);
  });
  it("page date ~2.5d before window with tolerance 6 → ~0.58", () => {
    // Page date parses as T12:00Z, WS start as T00:00Z → distance = 2.5d → 1 - 2.5/6
    const score = dateOverlapScore("2026-04-18", "2026-04-25", ["2026-04-15"], 6);
    expect(score).toBeCloseTo(0.583, 2);
  });
  it("page date 7 days outside tolerance 6 → 0", () => {
    expect(dateOverlapScore("2026-04-18", "2026-04-25", ["2026-04-10"], 6)).toBe(0);
  });
  it("no page dates → null (caller decides)", () => {
    expect(dateOverlapScore("2026-04-18", "2026-04-25", [])).toBeNull();
  });
  it("multiple page dates → uses best", () => {
    expect(
      dateOverlapScore("2026-04-18", "2026-04-25", ["2024-01-01", "2026-04-19"]),
    ).toBe(1);
  });
});

describe("classify", () => {
  it("ILCA 7 header → match", () => {
    expect(classify("ILCA 7 — Final Standings")).toBe("match");
  });
  it("Laser Standard → match", () => {
    expect(classify("Laser Standard Men")).toBe("match");
  });
  it("ILCA 6 only → mismatch", () => {
    expect(classify("ILCA 6 — Women's Final Standings")).toBe("mismatch");
  });
  it("Masters → mismatch", () => {
    expect(classify("ILCA Masters Worlds 2025")).toBe("mismatch"); // Masters negative wins, no ILCA 7 positive
  });
  it("mixed-fleet doc → match (extraction layer must scope)", () => {
    expect(classify("ILCA 6 Women / ILCA 7 Men")).toBe("match");
  });
  it("plain results table no class → absent", () => {
    expect(classify("Final Results — 53rd Edition")).toBe("absent");
  });
});

describe("classMatchScore", () => {
  it("match → 1", () => expect(classMatchScore("match")).toBe(1));
  it("mismatch → 0", () => expect(classMatchScore("mismatch")).toBe(0));
  it("absent → 0.5", () => expect(classMatchScore("absent")).toBe(0.5));
});

describe("extractDates", () => {
  it("ISO format", () => {
    expect(extractDates("Event 2026-04-25 was great")).toContain("2026-04-25");
  });
  it("European DMY with slashes", () => {
    expect(extractDates("Held 25/04/2026")).toContain("2026-04-25");
  });
  it("English MDY full month", () => {
    expect(extractDates("April 25, 2026")).toContain("2026-04-25");
  });
  it("English DMY full month", () => {
    expect(extractDates("25 April 2026")).toContain("2026-04-25");
  });
  it("returns empty when no date found", () => {
    expect(extractDates("no dates here")).toEqual([]);
  });
});
