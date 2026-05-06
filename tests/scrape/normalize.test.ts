import { describe, expect, it } from "vitest";
import {
  diceSimilarity,
  normalizeForMatch,
  stripDiacritics,
  stripHtml,
  tokens,
} from "../../src/lib/scrape/normalize";

describe("stripDiacritics", () => {
  it("removes Hungarian á", () => {
    expect(stripDiacritics("Juhász")).toBe("Juhasz");
  });
  it("removes French è", () => {
    expect(stripDiacritics("Hyères")).toBe("Hyeres");
  });
  it("leaves plain ASCII alone", () => {
    expect(stripDiacritics("James Juhasz")).toBe("James Juhasz");
  });
});

describe("normalizeForMatch", () => {
  it("lowercases and strips diacritics together", () => {
    expect(normalizeForMatch("JUHÁSZ")).toBe("juhasz");
  });
});

describe("tokens", () => {
  it("splits on non-letter boundaries", () => {
    expect(tokens("JUHASZ, James (CAN)")).toEqual(new Set(["juhasz", "james", "can"]));
  });
  it("handles diacritic in source", () => {
    expect(tokens("Juhász, James")).toEqual(new Set(["juhasz", "james"]));
  });
});

describe("diceSimilarity", () => {
  it("identical → 1.0", () => {
    expect(diceSimilarity("Princesa Sofia", "Princesa Sofia")).toBe(1);
  });
  it("near-identical with diacritic → very high", () => {
    expect(diceSimilarity("Hyères", "Hyeres")).toBe(1);
  });
  it("very different → low", () => {
    expect(diceSimilarity("Princesa Sofia", "Kiel Week")).toBeLessThan(0.3);
  });
  it("symmetric", () => {
    const a = diceSimilarity("foo bar", "foo baz");
    const b = diceSimilarity("foo baz", "foo bar");
    expect(a).toBe(b);
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    expect(stripHtml("<p>James &amp; Juhász</p>")).toBe("James & Juhász");
  });
});
