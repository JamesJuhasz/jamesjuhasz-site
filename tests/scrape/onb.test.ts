import { describe, expect, it } from "vitest";
import { deriveNoticeBoardUrl, findNoticeBoardAnchor } from "../../src/lib/scrape/onb";

describe("deriveNoticeBoardUrl — per-source rules", () => {
  it("manage2sail: swaps Result.aspx for Documents.aspx", () => {
    const out = deriveNoticeBoardUrl(
      "https://www.manage2sail.com/en-US/event/abc#!/Result.aspx?id=42",
    );
    expect(out).toContain("Documents");
  });

  it("returns null for unknown hosts", () => {
    expect(deriveNoticeBoardUrl("https://random-site.example/results")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(deriveNoticeBoardUrl("not-a-url")).toBeNull();
  });
});

describe("findNoticeBoardAnchor — anchor-text heuristic", () => {
  it("matches links labelled 'Notice Board'", () => {
    const html = `<a href="/onb">Notice Board</a><a href="/results">Results</a>`;
    expect(findNoticeBoardAnchor(html, "https://x.example")).toBe("https://x.example/onb");
  });
  it("matches links with documents in href", () => {
    const html = `<a href="/documents">Docs</a>`;
    expect(findNoticeBoardAnchor(html, "https://x.example")).toBe("https://x.example/documents");
  });
  it("matches links labelled 'Sailing Instructions'", () => {
    const html = `<a href="/si.pdf">Sailing Instructions</a>`;
    expect(findNoticeBoardAnchor(html, "https://x.example")).toBe("https://x.example/si.pdf");
  });
  it("returns null when nothing matches", () => {
    expect(findNoticeBoardAnchor(`<a href="/x">Y</a>`, "https://x.example")).toBeNull();
  });
});
