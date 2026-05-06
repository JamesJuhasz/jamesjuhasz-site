/*
  src/lib/scrape/discover.ts
  ---------------------------------------------------------------------------
  Given a World Sailing event row, return a ranked list of candidate URLs
  worth fetching. Three layers, tried in order:

    1. WS regattaWebsite — the federation's own link to the regatta. Highest-
       trust, present on most modern entries.
    2. Manage2Sail derivation — when a WS regattaCode looks like a Manage2Sail
       event ID, a few well-known URL templates often hit the published
       results page directly.
    3. Brave Search backstop — only when (1) and (2) fail. Requires
       BRAVE_SEARCH_API_KEY in the environment; if absent, the layer is
       skipped and the event is marked unresolved for retry.

  The orchestrator is responsible for actually fetching the URLs; this layer
  only proposes candidates.
*/

import { deriveAdapterUrls } from "./adapters";
import type { DiscoveredUrl, WSEventLite } from "./types";

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_TIMEOUT_MS = 12_000;

/**
 * Prepend `https://` if a URL string is missing a scheme. WS records sometimes
 * carry bare hostnames; this avoids feeding them to fetch() unmodified (which
 * throws on parse).
 */
function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}
export { ensureProtocol };

/**
 * Build the ranked candidate list for a given WS event.
 *
 * Order matters: fetched in this order, the first to produce an accept-tier
 * extraction wins. Layer 3 (Brave) is only consulted when 1+2 yield no URLs.
 */
export async function discoverCandidates(event: WSEventLite): Promise<DiscoveredUrl[]> {
  const out: DiscoveredUrl[] = [];

  // Layer 1: WS-supplied regatta website. WS data occasionally records bare
  // hostnames ("2024ilca7men.ilca-worlds.org") with no scheme; normalize so
  // adapters and fetch() see a parseable absolute URL.
  if (event.regattaWebsite) {
    out.push({ url: ensureProtocol(event.regattaWebsite), source: "ws-regatta-website" });
  }

  // Layer 2a: site-specific adapters. These take the regatta site and walk
  // it (one HTTP fetch per adapter) to produce deep-link result URLs —
  // year archives, "Results" menu pages, etc. Always cheaper than Brave;
  // run before Brave even when Layer 1 produced a candidate, because the
  // adapter result is usually a much better extraction target than the
  // homepage.
  const fromAdapters = await deriveAdapterUrls(event);
  for (const d of fromAdapters) {
    if (!out.some((x) => x.url === d.url)) out.push(d);
  }

  // Layer 2b: derived Manage2Sail URL when WS regatta code is present.
  // Manage2Sail event pages are slugged on event UUID, not regatta code, so
  // we can't deep-link to results from the regatta code alone — but for
  // events the federation already linked to manage2sail's domain, the
  // landing page often contains a "Results" tab we can extract via the
  // Playwright path.
  for (const url of deriveManage2SailGuesses(event)) {
    if (!out.some((d) => d.url === url)) {
      out.push({ url, source: "manage2sail-derived" });
    }
  }

  // Layer 3: Brave Search — runs when adapters produced no deep links. The
  // homepage URL alone (Layer 1) is rarely the actual results page, so an
  // event sitting at length === 1 with only `ws-regatta-website` is a
  // strong signal that we need search to bridge the gap. Brave URLs sort
  // after WS-supplied / adapter URLs, so the orchestrator still tries
  // higher-trust candidates first.
  const onlyHomepage = out.every((d) => d.source === "ws-regatta-website");
  if (out.length === 0 || onlyHomepage) {
    const fromBrave = await searchBrave(event);
    for (const d of fromBrave) {
      if (!out.some((x) => x.url === d.url)) out.push(d);
    }
  }

  return out;
}

/**
 * Derive plausible Manage2Sail URLs from a WS regatta code.
 *
 * We don't speculate fresh URLs from thin air — only return guesses when WS
 * already knows about a Manage2Sail link OR the regatta code suggests M2S
 * is the scoring host. Conservative on purpose: false discoveries waste a
 * Playwright launch.
 */
function deriveManage2SailGuesses(event: WSEventLite): string[] {
  // For now we don't synthesize URLs without WS confirmation — the regatta
  // code alone isn't enough. This is a hook for future expansion when we
  // identify a deterministic mapping.
  void event;
  return [];
}

type BraveSearchResponse = {
  web?: {
    results?: Array<{
      url: string;
      title?: string;
      description?: string;
    }>;
  };
};

/**
 * Brave Web Search query for the event's results page.
 *
 * Query shape: `"<regatta name>" <year> ILCA 7 results`. Quoted regatta name
 * pins relevance; year and class qualifiers narrow to the right edition.
 *
 * Skipped (returns []) if BRAVE_SEARCH_API_KEY is unset — that's the
 * documented "no backstop available" path.
 */
async function searchBrave(event: WSEventLite): Promise<DiscoveredUrl[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const year = event.startDate.slice(0, 4);
  // The regatta name usually carries the class signal ("ILCA 7 World",
  // "Laser North American", "Senior European"), so we don't bake "ILCA 7"
  // into the query — older events used "Laser" terminology and the strict
  // class qualifier filtered out their results pages. Quoted name pins
  // edition; year narrows; "results" biases toward a scoring page.
  const query = `"${event.regattaName}" ${year} results`;
  const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=10&safesearch=off`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BRAVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "x-subscription-token": apiKey,
        accept: "application/json",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[discover] brave search HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as BraveSearchResponse;
    const results = json.web?.results ?? [];
    // Drop social media, news article aggregators, and obvious non-result domains.
    const blocklist = ["twitter.com", "facebook.com", "instagram.com", "youtube.com", "tiktok.com"];
    return results
      .map((r) => r.url)
      .filter((u) => {
        try {
          const host = new URL(u).hostname.toLowerCase();
          return !blocklist.some((b) => host.endsWith(b));
        } catch {
          return false;
        }
      })
      .slice(0, 6)
      .map<DiscoveredUrl>((u) => ({ url: u, source: "brave-search" }));
  } catch (err) {
    console.warn(`[discover] brave search failed: ${(err as Error).message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
