import { describe, expect, it } from "vitest";
import { isOngoing, mergeOngoingSources, buildOngoingResults } from "../src/lib/ongoing";

describe("isOngoing", () => {
  it("returns true when today falls inside [startDate, endDate]", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-12")).toBe(true);
  });
  it("treats endpoints as inclusive", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-10")).toBe(true);
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-14")).toBe(true);
  });
  it("returns false before start and after end", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-09")).toBe(false);
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-14" }, "2026-05-15")).toBe(false);
  });
  it("handles single-day events (endDate == startDate)", () => {
    expect(isOngoing({ startDate: "2026-05-10", endDate: "2026-05-10" }, "2026-05-10")).toBe(true);
  });
});

describe("mergeOngoingSources", () => {
  const today = "2026-05-12";

  it("returns only regattas where today is within range", () => {
    const admin = [
      { slug: "a", title: "Sofia", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Regatta", status: "upcoming", excerpt: "", location: "Palma" },
      { slug: "b", title: "Old", eventDate: "2026-04-01", endDate: "2026-04-05", category: "Regatta", status: "past", excerpt: "", location: "x" },
      { slug: "c", title: "Future", eventDate: "2026-06-01", endDate: "2026-06-05", category: "Regatta", status: "upcoming", excerpt: "", location: "y" },
    ] as const;
    const result = mergeOngoingSources(admin as never, [], [], today);
    expect(result.map((r) => r.slug)).toEqual(["a"]);
  });

  it("skips non-Regatta categories", () => {
    const admin = [
      { slug: "t", title: "Training Block", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Training", status: "upcoming", excerpt: "", location: "x" },
    ] as const;
    const result = mergeOngoingSources(admin as never, [], [], today);
    expect(result).toEqual([]);
  });

  it("dedupes by normalized title across sources (admin wins)", () => {
    const admin = [
      { slug: "sofia-admin", title: "  Trofeo Princesa SOFIA  ", eventDate: "2026-05-10", endDate: "2026-05-14", category: "Regatta", status: "upcoming", excerpt: "", location: "Palma" },
    ];
    const coachaible = [
      { id: "coachaible-42", title: "Trofeo Princesa Sofia", startDate: "2026-05-10", endDate: "2026-05-14", eventType: "race", racePriority: null, country: null },
    ];
    const result = mergeOngoingSources(admin as never, [], coachaible as never, today);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe("sofia-admin");
  });
});

describe("buildOngoingResults", () => {
  const today = "2026-05-12";
  const regatta = {
    slug: "sofia-2026",
    title: "Trofeo Princesa Sofia 2026",
    startDate: "2026-05-10",
    endDate: "2026-05-14",
    location: "Palma de Mallorca",
  };

  it("computes day-of-regatta from today and date range", () => {
    const [r] = buildOngoingResults([regatta], { items: [] }, today);
    expect(r.dayOfRegatta).toEqual({ current: 3, total: 5 });
    expect(r.status).toBe("ongoing");
    expect(r.position).toBeNull();
  });

  it("joins scraped row by slug and surfaces position + URLs", () => {
    const scraped = {
      items: [{
        slug: "sofia-2026",
        title: regatta.title,
        startDate: regatta.startDate,
        endDate: regatta.endDate,
        position: "7",
        totalCompetitors: 64,
        fleet: "ILCA 7 Open",
        externalUrl: "https://example.com/results",
        noticeBoardUrl: "https://example.com/notices",
        source: "manage2sail.com",
        resolvedUrl: "https://example.com/results",
        resolvedAt: "2026-05-10T08:14:00Z",
        failedExtractions: 0,
        scrapedAt: "2026-05-12T14:23:00Z",
      }],
    };
    const [r] = buildOngoingResults([regatta], scraped, today);
    expect(r.position).toBe("7");
    expect(r.totalCompetitors).toBe(64);
    expect(r.fleet).toBe("ILCA 7 Open");
    expect(r.externalUrl).toBe("https://example.com/results");
    expect(r.noticeBoardUrl).toBe("https://example.com/notices");
    expect(r.lastUpdated).toBe("2026-05-12T14:23:00Z");
  });

  it("returns empty array when no ongoing regattas", () => {
    expect(buildOngoingResults([], { items: [] }, today)).toEqual([]);
  });
});
