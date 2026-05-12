import { JSDOM } from "jsdom";

/**
 * Per-source derivation: given a resolved live-scoreboard URL, return the
 * URL of the same regatta's Online Notice Board. Returns null when no rule
 * matches — caller falls back to anchor scan.
 */
export function deriveNoticeBoardUrl(resolvedUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(resolvedUrl);
  } catch {
    return null;
  }
  const host = u.host.toLowerCase();
  if (host.endsWith("manage2sail.com")) {
    // M2S routes share the event id; the docs/notices tab is reached by
    // swapping the inner path segment. Be conservative: just replace the
    // Result token, leave query intact.
    const swapped = resolvedUrl.replace(/Result\.aspx/i, "Documents.aspx");
    return swapped !== resolvedUrl ? swapped : null;
  }
  // Add more per-source rules here as we encounter live regattas on them.
  return null;
}

const ONB_RX = /notice ?board|^onb$|documents|sailing instructions/i;

/**
 * Crawl-time fallback: parse the given HTML page for an anchor whose visible
 * text or href looks like a notice-board link. Returns absolute URL or null.
 */
export function findNoticeBoardAnchor(
  html: string,
  baseUrl: string,
): string | null {
  const dom = new JSDOM(html);
  const anchors = Array.from(dom.window.document.querySelectorAll("a")) as Element[];
  for (const a of anchors) {
    const text = (a.textContent ?? "").trim();
    const href = a.getAttribute("href") ?? "";
    if (!href) continue;
    if (ONB_RX.test(text) || ONB_RX.test(href)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}
