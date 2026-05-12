import { describe, expect, it } from "vitest";
import { isOngoing, mergeOngoingSources } from "../src/lib/ongoing";

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
