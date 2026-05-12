import { describe, expect, it } from "vitest";
import { filterPressForEvent } from "../src/lib/press";
import type { SeedPress } from "../src/lib/seed-data";

const press: SeedPress[] = [
  { articleTitle: "Juhasz strong at Trofeo Princesa Sofia day 2", publication: "Sail-World", publishedAt: "2026-05-11", externalUrl: "https://a.example/1", excerpt: "Day 2 recap" },
  { articleTitle: "Unrelated piece on rigging", publication: "Sail-World", publishedAt: "2026-05-11", externalUrl: "https://a.example/2", excerpt: "" },
  { articleTitle: "Sofia preview", publication: "World Sailing", publishedAt: "2026-05-05", externalUrl: "https://a.example/3", excerpt: "Preview of Trofeo Princesa Sofia" },
  { articleTitle: "Way after the event", publication: "x", publishedAt: "2026-08-01", externalUrl: "https://a.example/4", excerpt: "Trofeo Princesa Sofia recap" },
];

describe("filterPressForEvent", () => {
  it("matches articles whose title or excerpt contains the regatta title within the window", () => {
    const out = filterPressForEvent(press, {
      title: "Trofeo Princesa Sofia",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out.map((p) => p.externalUrl)).toEqual([
      "https://a.example/1",
      "https://a.example/3",
    ]);
  });

  it("excludes articles outside [startDate - 7d, endDate + 30d]", () => {
    const out = filterPressForEvent(press, {
      title: "Trofeo Princesa Sofia",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out.find((p) => p.externalUrl === "https://a.example/4")).toBeUndefined();
  });

  it("returns empty array when no matches", () => {
    const out = filterPressForEvent(press, {
      title: "Unrelated Regatta",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
    });
    expect(out).toEqual([]);
  });
});
