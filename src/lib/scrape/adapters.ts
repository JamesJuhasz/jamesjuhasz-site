/*
  src/lib/scrape/adapters.ts
  ---------------------------------------------------------------------------
  Site-specific URL derivation. Each adapter knows how to take a WS event and
  produce one or more deep-link candidate URLs for the event's ILCA 7 final
  results, by scraping the regatta site's known structure.

  Adapters run in discovery — they fetch lightweight pages (year archives,
  homepages) and emit deep links that feed the existing extractFromHtml /
  extractFromPdf pipeline. We do NOT bypass the extractor; adapters only
  shorten the discovery path so the extractor lands on a results page
  instead of a homepage that hides results behind a menu.

  Adding a new adapter:
    1. Define a SiteAdapter object below.
    2. Add it to ADAPTERS in registration order. Order matters when two
       adapters could match — the first match wins, but we run all matches
       and union the results so this is rare.
*/

import { JSDOM } from "jsdom";
import { fetchUrl, bufferToText, DEFAULT_TIMEOUT_MS } from "./fetch";
import type { DiscoveredUrl, WSEventLite } from "./types";

export type SiteAdapter = {
  /** Stable name; used in DiscoveredUrl source for logging. */
  name: string;
  /** True if this adapter should attempt to derive deep links for the event. */
  matches: (event: WSEventLite) => boolean;
  /** Returns absolute URLs to try, in priority order. */
  derive: (event: WSEventLite) => Promise<string[]>;
};

/**
 * Fetch HTML text with a short timeout. Returns null on failure.
 *
 * Adapters are fault-tolerant: a failed fetch should silently fall through
 * to other discovery layers. We don't surface adapter-fetch errors to the
 * caller because they're noise.
 */
async function fetchHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  const r = await fetchUrl(ensureProtocol(url), { timeoutMs });
  if (!r.ok) return null;
  return bufferToText(r.body);
}

/** Prepend `https://` if a URL string is missing a scheme. WS data sometimes
 * carries bare hostnames; without this, fetch() throws on parse and adapters
 * silently return []. */
function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

/**
 * True if href looks like an ILCA 7 / Standard / Laser results link.
 *
 * We classify on href alone — link TEXT often says "Laser Standard & Radial"
 * for mixed-fleet files. The href filename usually betrays which fleet the
 * file contains (e.g. /ocr/laser_results.htm vs /ocr/radial_results.htm),
 * but mixed-class files (ILCA 4 and 7.html, all-classes-overall.pdf) must
 * also be accepted — the extractor handles intra-file fleet scoping.
 *
 * The basename test is conservative: we only reject when the basename
 * indicates a fleet that demonstrably excludes ILCA 7 (radial-only,
 * masters-only, ILCA6, women, youth, etc.). A name containing ILCA 7 OR
 * generic "laser" / "standard" / "lsr" passes.
 */
function looksLikeIlca7Link(href: string, _linkText: string): boolean {
  const decoded = (() => {
    try {
      return decodeURIComponent(href.toLowerCase());
    } catch {
      return href.toLowerCase();
    }
  })();
  // Take the URL path's last segment as basename for stricter matching;
  // also keep the full path for general signals.
  const noQuery = decoded.split("?")[0].split("#")[0];
  const segments = noQuery.split("/").filter(Boolean);
  const basename = segments[segments.length - 1] ?? "";
  const path = segments.join("/");

  // Reject when basename names an exclusively non-ILCA-7 fleet.
  // Note: "ILCA 4 and 7" includes "7" so it doesn't trip these.
  // Reject only when basename is clearly NOT mixed with ILCA 7. Lookahead
  // `(?!.*7)` keeps mixed-fleet files like "ILCA 4 and 7.html" eligible.
  const exclusivelyNotIlca7 = [
    /^ilca[\s_-]*6(?!.*7)/,
    /^ilca[\s_-]*4(?!.*7)/,
    /^radial(?!.*standard)/,
    /^laser[\s_-]*radial(?!.*standard)/,
    /^4[\s._-]?7\b/,
    /^lasermasters?/,
    /^masters?\b/,
    /^women\b/,
    /^girls?\b/,
    /^ladies\b/,
    /^youth\b/,
    /^junior\b/,
    /^u(21|19|17)\b/,
    /^opti(mist)?\b/,
    /^29er\b/,
    /^420\b/,
    /^etchells?\b/,
    /^etc\b/,
    /^olson\b/,
    /^boards?\b/,
    /^foil/,
  ];
  if (exclusivelyNotIlca7.some((re) => re.test(basename))) return false;

  // Reject path segments that strongly imply a non-ILCA-7 fleet folder.
  // `master` covers euromasters, lasermasters, masters subfolders (with
  // optional trailing `s`); the rest are one-design class folders that
  // don't host ILCA 7 results. We test each segment so the filter doesn't
  // depend on segments.join("/") producing a leading slash.
  const fleetFolderRe = /^(.*masters?|optim?i?st|radial|29er|420|opti)$/;
  if (segments.slice(0, -1).some((seg) => fleetFolderRe.test(seg))) return false;

  // Accept basenames that look like ILCA 7 / Standard fleet results.
  // Trailing optional `m` / `men` covers files named "ILCA-7M-2025-CHN-Results.html"
  // — federation-class shorthand for ILCA 7 Men. The `\b` after `7` would
  // otherwise fail (digit→letter is not a word boundary).
  // `(?!\d)` instead of `\b` so `ilca7_gold_open.pdf` matches — `_` is a word
  // char, so `\b` after `7` requires a non-word boundary that `_` doesn't give.
  if (/\bilca[\s_\-%]*0?7(?:m(?:en)?)?(?!\d)/.test(basename)) return true;
  // Mixed-class basename like "ilca 4 and 7" — has whole-word "7" plus class noun.
  if (/\b7\b/.test(basename) && /(ilca|laser)/.test(basename)) return true;
  if (/\bstandard\b/.test(basename)) return true;
  // Generic laser-class basename: "laser_results.htm", "LASER.html", "LSR.html".
  if (/^laser([._\s\-]|$)/.test(basename)) return true;
  if (/^lsr([._\s\-]|$)/.test(basename)) return true;
  // Federation shorthand: "Results-7M-AUS-Final.html" — basename starts with
  // "results" but contains "-7m-" or "_7m_" indicating ILCA 7 Men.
  if (/[\s\-_.]7m(?:en)?[\s\-_.]/.test(basename) || /[\s\-_.]7m(?:en)?$/.test(basename.replace(/\.[a-z]+$/, ""))) return true;
  // Senior Europeans split-fleet finals (EurILCA convention): GOLD_FINAL_OPEN.pdf,
  // SILVER_FINAL_EU.pdf, BRONZE_FINAL.pdf are ILCA 7 senior fleets — ILCA 6 / 4
  // PDFs from the same event are named with explicit "ILCA_6"/"ILCA_4" prefix
  // (already rejected above), so a gold/silver/bronze basename without a class
  // qualifier is unambiguously ILCA 7.
  if (/^(gold|silver|bronze)([._\-\s]|$)/.test(basename)) return true;
  // "Laser" appears anywhere in basename and no fleet-disqualifying token
  // sits next to it. Catches embedded names like
  // "CYCNORLaserMidwintersEast20181.pdf" where "laser" isn't anchored at
  // start but is unambiguous in context.
  if (/laser/.test(basename) && !/(radial|6\.7|4\.7|master|optim|29er|420|opti)/.test(basename)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Cork.org — CORK / Sail Kingston, ILCA 7 = "Laser" in their archive files.
//
// Structure:
//   /archived-results/{YYYY}-results/  ←  year landing page
//   /past-results/results{YYYY}/{ocr|fall}/laser_results.htm  ← deep link
//
// The deep-link filename is inconsistent across years (case, plural, .htm
// vs .html), so we scrape the year landing page rather than template-build.
// ---------------------------------------------------------------------------
const CORK_ADAPTER: SiteAdapter = {
  name: "cork",
  matches: (event) => /^https?:\/\/(www\.)?cork\.org\b/i.test(event.regattaWebsite ?? ""),
  derive: async (event) => {
    const year = new Date(event.startDate).getUTCFullYear();

    const yearPage = `https://www.cork.org/archived-results/${year}-results/`;
    const html = await fetchHtml(yearPage);
    if (!html) return [];

    let dom: JSDOM;
    try {
      dom = new JSDOM(html);
    } catch {
      return [];
    }
    const anchors = Array.from(dom.window.document.querySelectorAll("a[href]")) as Element[];

    // CORK has two events per year (OCR / Fall). We deliberately do NOT
    // filter by season — WS event dates occasionally disagree with the
    // file the sailor's row actually appears in (e.g., WS Aug-2016 OCR
    // entry, sailor only present in the Sept-2016 Fall file). Send all
    // ILCA-7-shaped candidates and let dateOverlap + position scoring
    // pick the right one.
    const out: string[] = [];
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      const text = (a.textContent ?? "").trim();
      if (!/laser|ilca|lsr/i.test(href)) continue;
      if (!looksLikeIlca7Link(href, text)) continue;

      try {
        out.push(new URL(href, yearPage).toString());
      } catch {
        // skip malformed
      }
    }
    return out;
  },
};

// ---------------------------------------------------------------------------
// ILCA microsite family — eurilca.org, eurilca-europeans.org subdomains,
// ilca-worlds.org subdomains, laser-worlds.com subdomains, and the
// laserinternational.org event-site portal.
//
// All variants expose either:
//   (a) a top-level menu link with text matching /^(final )?results?$/i
//       pointing at a Sailwave-generated HTML or PDF, or
//   (b) inside .entry-content (eurilca.org blog posts), an inline link to
//       eurilca.eu/documents/{id}/results/ilca7.htm or a .pdf.
// ---------------------------------------------------------------------------
const ILCA_MICROSITE_HOSTS = /\b(eurilca\.org|eurilca-europeans\.org|ilca-worlds\.org|laser-worlds\.com|laserinternational\.org)\b/i;

const ILCA_MICROSITE_ADAPTER: SiteAdapter = {
  name: "ilca-microsite",
  matches: (event) => ILCA_MICROSITE_HOSTS.test(event.regattaWebsite ?? ""),
  derive: async (event) => {
    const homepage = ensureProtocol(event.regattaWebsite!);
    const html = await fetchHtml(homepage);
    if (!html) return [];

    let dom: JSDOM;
    try {
      dom = new JSDOM(html);
    } catch {
      return [];
    }
    const doc = dom.window.document;
    const out: string[] = [];

    const allAnchors = Array.from(doc.querySelectorAll("a[href]")) as Element[];
    const seen = new Set<string>();
    const push = (rawHref: string, opts: { skipFleetCheck?: boolean } = {}) => {
      try {
        const u = new URL(rawHref, homepage).toString();
        if (seen.has(u)) return;
        // Even when the link TEXT looks like a generic "Results" menu, the
        // resolved URL itself may point at a fleet-specific subpage (e.g.
        // eurilca.eu/euromasters/results). Run the path-shape check on the
        // absolute URL so fleet folders are rejected regardless of how the
        // link was discovered. The check accepts ambiguous bare paths
        // ("/results", "/standings") that lack any fleet hint.
        if (!opts.skipFleetCheck) {
          const path = (() => {
            try { return new URL(u).pathname.toLowerCase(); } catch { return ""; }
          })();
          const segs = path.split("/").filter(Boolean);
          const fleetFolderRe = /^(.*masters?|optim?i?st|radial|29er|420|opti)$/;
          if (segs.slice(0, -1).some((s) => fleetFolderRe.test(s))) return;
        }
        seen.add(u);
        out.push(u);
      } catch {
        // skip
      }
    };

    for (const a of allAnchors) {
      const text = (a.textContent ?? "").trim();
      const href = a.getAttribute("href") ?? "";
      if (!href) continue;
      const lowerText = text.toLowerCase();

      // (a) Menu/nav anchors literally labeled "Results" / "Standings" /
      // "Final Results" — homepage navigation.
      if (
        /^(final\s+)?results?$/i.test(text) ||
        /^standings$/i.test(text) ||
        /^classifications?$/i.test(text)
      ) {
        push(href);
        // sailingresults.net index → also emit the deep overall standings
        // (extractor reads tables; the index is just a list of links).
        const srMatch0 = href.match(/sailingresults\.net\/\?ID=(\d+)/i);
        if (srMatch0) {
          push(`http://sailingresults.net/sa/results/overall.aspx?ID=${srMatch0[1]}.1`, {
            skipFleetCheck: true,
          });
        }
        continue;
      }

      // (b) eurilca-europeans pattern: anchor text matches
      // "Results – ILCA 7 Gold/Silver/Bronze" or "RESULTS – I7 GOLD".
      // Accept any results-tagged ILCA-7-or-Standard fleet (gold/silver/
      // bronze are sub-fleets in big championships and James's row could
      // be in any of them depending on cut-off).
      const isResultsLabeled =
        /\bresults?\b/i.test(lowerText) || /\bstandings\b/i.test(lowerText) || /\bclassifi/i.test(lowerText);
      const looksLikeIlca7Text =
        /\b(ilca\s*7|i7|standard|laser\s*standard|standard\s*men|ilca\s*men)\b/i.test(text);
      const looksLikeNotIlca7Text = /\b(ilca\s*[46]|i[46]|radial|4\.7|women|girls|youth|junior|master)\b/i.test(text);
      if (isResultsLabeled && looksLikeIlca7Text && !looksLikeNotIlca7Text) {
        push(href);
        continue;
      }

      // (c) Inline-content link to a results file (PDF or .htm) that
      // looks like ILCA 7 by href shape.
      const lower = href.toLowerCase();
      const isResultFile =
        lower.endsWith(".pdf") || lower.endsWith(".htm") || lower.endsWith(".html") ||
        /\/(results|standings)\b/i.test(href) ||
        /eurilca\.eu\/(documents|europacup)/i.test(href);
      if (isResultFile && looksLikeIlca7Link(href, text)) {
        push(href);
      }

      // (d) sailingresults.net index links (`/?ID=N`). Microsite Results
      // menus (e.g. 2020 laser-worlds.com) sometimes point at the
      // sailingresults.net index page rather than the overall standings.
      // Emit both the index AND a derived `/sa/results/overall.aspx?ID=N.1`
      // URL — the latter is what the extractor needs to find the row.
      const srMatch = href.match(/sailingresults\.net\/\?ID=(\d+)/i);
      if (srMatch) {
        push(href);
        push(`http://sailingresults.net/sa/results/overall.aspx?ID=${srMatch[1]}.1`, {
          skipFleetCheck: true,
        });
      }
    }

    return out;
  },
};

// ---------------------------------------------------------------------------
// Sailing.laserinternational.org — portal that just links to the matching
// laser-worlds.com microsite. Treat it like an ILCA microsite (same logic
// works) but match it explicitly so the microsite adapter doesn't have to
// branch.
// ---------------------------------------------------------------------------
// (Already covered by ILCA_MICROSITE_HOSTS — laserinternational.org included.)

// ---------------------------------------------------------------------------
// EurILCA blog/event walker — eurilca.org hosts blog-style result posts
// (final-results-YYYY-..., race-day-N-results-YYYY-...) and parent event
// pages (YYYY-(senior|master)-european-championships) that point at the
// real Sailwave results on eurilca.eu. Two-hop walk:
//
//   eurilca.org page  →  eurilca.eu/event/{id}/(documents|results)
//                     →  eurilca.eu/documents/{id}/ILCA7*.pdf
//
// We also derive plausible YYYY-(senior|master|...)eurilca-europeans.org
// subdomains from the event name for years where the federation hosts the
// regatta on a per-year subdomain — those run through the existing ILCA
// microsite adapter, but we have to put the URL into discovery first.
// ---------------------------------------------------------------------------
const EURILCA_DOMAIN_RE = /\b(eurilca\.org|eurilca-europeans\.org)\b/i;

/** True if the regatta name matches a known EurILCA-hosted event (so we can
 *  fire the adapter even when WS regattaWebsite is absent — this is the case
 *  for 2019/2021/2022 Senior Europeans which have no WS website link). */
function eurilcaNameMatches(event: WSEventLite): boolean {
  const n = (event.regattaName ?? "").toLowerCase();
  if (/eurilca\b/.test(n)) return true;
  // "Laser Senior European Championship", "Laser Master European Championship",
  // "Laser Under-21 European Championship" — the federation rebranded ILCA in
  // 2020, so older WS records still say "Laser ___ European".
  if (/\blaser\s+(senior|master|under[\s-]?21|u21)\s+european\s+champion/i.test(n)) return true;
  if (/\b(senior|master|under[\s-]?21|u21)\s+european\s+champion.*laser/i.test(n)) return true;
  return false;
}

const EURILCA_BLOG_ADAPTER: SiteAdapter = {
  name: "eurilca-blog-walker",
  matches: (event) =>
    EURILCA_DOMAIN_RE.test(event.regattaWebsite ?? "") || eurilcaNameMatches(event),
  derive: async (event) => {
    // When WS doesn't supply a regattaWebsite, seed the walker on the
    // canonical eurilca.org homepage — its hop1 menu links to all known
    // year-edition archive pages, which the slug-template guesses below
    // also target directly.
    const homepage = event.regattaWebsite
      ? ensureProtocol(event.regattaWebsite)
      : "https://eurilca.org/";
    // Hoisted before walk() definition so the closure capture isn't in TDZ
    // when hop1 = await walk(homepage) runs (walk reads `year` and `name`
    // when filtering eurilca-europeans subdomains by year + fleet prefix).
    const year = new Date(event.startDate).getUTCFullYear();
    const name = (event.regattaName ?? "").toLowerCase();
    const visited = new Set<string>();
    const out: string[] = [];

    // Walk one page, collecting next-hop URLs and any ILCA-7-shaped result
    // links. Returns the next-hop URLs found on this page.
    const walk = async (url: string): Promise<string[]> => {
      if (visited.has(url)) return [];
      visited.add(url);
      const html = await fetchHtml(url);
      if (!html) return [];
      let dom: JSDOM;
      try { dom = new JSDOM(html); } catch { return []; }
      const anchors = Array.from(dom.window.document.querySelectorAll("a[href]")) as Element[];
      const nextHops: string[] = [];
      const nextHopSeen = new Set<string>();
      const pushNextHop = (u: string) => {
        if (nextHopSeen.has(u)) return;
        nextHopSeen.add(u);
        nextHops.push(u);
      };
      for (const a of anchors) {
        const rawHref = a.getAttribute("href") ?? "";
        if (!rawHref) continue;
        let abs: string;
        try {
          const u = new URL(rawHref, url);
          // Strip fragment so nav anchors (`href="#section"`) don't flood
          // nextHops with N copies of the same page URL — each empty hash
          // serializes back to the page itself, hogging perLevel slots.
          u.hash = "";
          abs = u.toString();
        } catch { continue; }

        // Next-hop: parent event page on eurilca.org (e.g.
        // /YYYY-senior-european-championships/, /YYYY-eurilca-europa-cup-mlt/).
        if (
          /\beurilca\.org\/(?:[0-9]{4}-|final-results-[0-9]{4}-|race-day-\d+-(?:report-)?[0-9]{4}-)/.test(abs) &&
          /european|europeans|europa-cup|euro-?cup/i.test(abs)
        ) {
          pushNextHop(abs);
        }
        // Next-hop: eurilca.eu event page or results page; convert event.php
        // into results.php (results page lists the ILCA 7 PDFs).
        const evMatch = abs.match(/eurilca\.eu\/event\/(?:event|results)\.php\?id=(\d+)/i);
        if (evMatch) {
          pushNextHop(`https://eurilca.eu/event/results.php?id=${evMatch[1]}`);
          continue;
        }
        const evMatch2 = abs.match(/eurilca\.eu\/event\/(\d+)(?:\/(?:documents|results))?\/?$/i);
        if (evMatch2) {
          pushNextHop(`https://eurilca.eu/event/results.php?id=${evMatch2[1]}`);
          continue;
        }
        // Direct ILCA 7 PDF/HTML on eurilca.eu/documents/.
        if (/eurilca\.eu\/documents\/\d+\//i.test(abs)) {
          const text = (a.textContent ?? "").trim();
          if (looksLikeIlca7Link(abs, text)) {
            if (!out.includes(abs)) out.push(abs);
          }
          continue;
        }
        // Direct PDF on eurilca.org/wp-content/uploads/{year}/ — many post-2020
        // result posts host the senior split-fleet PDFs (GOLD_FINAL_OPEN.pdf,
        // SILVER_FINAL_OPEN.pdf) directly on the WordPress media library
        // instead of the legacy eurilca.eu /documents/ folder.
        if (
          /eurilca\.org\/wp-content\/uploads\//i.test(abs) &&
          /\.(pdf|html?)$/i.test(abs)
        ) {
          const text = (a.textContent ?? "").trim();
          if (looksLikeIlca7Link(abs, text)) {
            if (!out.includes(abs)) out.push(abs);
          }
          continue;
        }
        // Per-year subdomain (YYYY-senior.eurilca-europeans.org or legacy
        // YYYY-senior.laser-europeans.org) — hand off to discovery and walk
        // ourselves to reach nested /laser-standard-european-results/ pages
        // that hold the actual PDF link. Filter to subdomains whose year
        // prefix matches the target event year AND whose fleet-type prefix
        // matches the target event's fleet — otherwise hop1 menu links to
        // 5+ unrelated fleets (ilca4youth, ilca6youth, master, under21)
        // each year, drowning discovery in 50+ candidates.
        const subdomainRe = /\b(\d{4})-([a-z0-9]+)\.(eurilca-europeans|laser-europeans)\.org\b/i;
        const subMatch = abs.match(subdomainRe);
        const fleetSlug = subMatch?.[2]?.toLowerCase() ?? "";
        const fleetMatches = (() => {
          if (!fleetSlug) return false;
          if (/\bsenior\b/.test(name)) return fleetSlug === "senior";
          if (/\bmaster/.test(name)) return fleetSlug === "master";
          if (/\bunder[\s-]?21\b|\bu21\b/.test(name)) return fleetSlug === "under21";
          // Fleet-type unknown from regatta name: accept any (legacy fallback).
          return true;
        })();
        if (subMatch && subMatch[1] === String(year) && fleetMatches) {
          if (!out.includes(abs)) out.push(abs);
          if (/-europeans\.org\/?$/.test(abs) ||
              /-europeans\.org\/[^/]*\/?$/.test(abs)) {
            pushNextHop(abs);
          }
          if (/\.(pdf|html?)$/i.test(abs)) {
            const text = (a.textContent ?? "").trim();
            if (looksLikeIlca7Link(abs, text)) {
              if (!out.includes(abs)) out.push(abs);
            }
          }
        }
        // External scoring-host result links from EurILCA per-year subdomains
        // (e.g. onb.eurilca.roms.ar — the federation's "online noticeboard"
        // hosts the actual Sailwave HTML for some senior editions). The
        // current page must itself be a per-year subdomain so we only emit
        // these for the right edition.
        if (
          /\.(?:eurilca-europeans|laser-europeans)\.org\b/i.test(url) &&
          /\b(onb\.eurilca|ilca-results|results\.ilca|ilca\.online)\b/i.test(abs)
        ) {
          const text = (a.textContent ?? "").trim();
          if (/^results?$/i.test(text) || /\/result|\/onb-result/i.test(abs)) {
            if (!out.includes(abs)) out.push(abs);
          }
        }
      }
      return nextHops;
    };

    // Hop 1: regattaWebsite. Hop 2: any parent-event/eurilca.eu page found
    // on hop 1. Cap walk depth at 2 — beyond that we're chasing nav menus.
    const hop1 = await walk(homepage);

    // Name-template guesses for the parent event page on eurilca.org. Many
    // WS regattaWebsite URLs point to a "final-results-YYYY-..." or
    // "race-day-N-results-YYYY-..." post that does NOT link back to the
    // canonical /{year}-{event-slug}/ archive page (where the eurilca.eu
    // event ID lives). Guess the canonical slugs so hop2 can walk them.
    const slugGuesses: string[] = [];
    if (/\bsenior\b/.test(name) || /senior-european/.test(homepage)) {
      slugGuesses.push(`${year}-senior-european-championships`);
      slugGuesses.push(`${year}-eurilca-senior-european-championships`);
      slugGuesses.push(`${year}-laser-senior-european-championships`);
    }
    if (/\bmaster/.test(name)) {
      slugGuesses.push(`${year}-master-european-championships`);
      slugGuesses.push(`${year}-eurilca-master-european-championships`);
    }
    if (/\bunder[\s-]?21\b|\bu21\b/.test(name)) {
      slugGuesses.push(`${year}-under21-european-championships`);
      slugGuesses.push(`${year}-eurilca-under21-european-championships`);
    }
    if (/europa\s*cup/.test(name)) {
      // Europa Cup events have a country-code suffix, often "mlt", "esp", "fra".
      // Guess from regatta name location words; fall through if unmatched.
      const cc = name.match(/\b(malta|spain|france|italy|portugal|germany|netherlands|denmark|poland|croatia|greece|turkey)\b/);
      const ccMap: Record<string, string> = {
        malta: "mlt", spain: "esp", france: "fra", italy: "ita",
        portugal: "por", germany: "ger", netherlands: "ned", denmark: "den",
        poland: "pol", croatia: "cro", greece: "gre", turkey: "tur",
      };
      if (cc) slugGuesses.push(`${year}-eurilca-europa-cup-${ccMap[cc[1]]}`);
    }
    const guessUrls = slugGuesses.map((s) => `https://eurilca.org/${s}/`);

    // Recursive walk. Some events nest 4 levels deep:
    //   eurilca.org/{year}-final-results-...
    //     → eurilca.org/{year}-laser-senior-european-championships
    //       → 2019-senior.eurilca-europeans.org/...-results/
    //         → 2019-senior.eurilca-europeans.org/laser-standard-european-results/
    //           → wp-content/uploads/.../Laser-Standart-European-FINAL.pdf
    const walkRec = async (urls: string[], depth: number, perLevel: number) => {
      if (depth === 0) return;
      const next: string[] = [];
      const targetYear = String(year);
      // Prioritize URLs that mention the target year — far less wasted fetches
      // when hop1's menu carries every past-edition slug.
      const sorted = [...urls].sort((a, b) => {
        const aHit = a.includes(targetYear) ? 0 : 1;
        const bHit = b.includes(targetYear) ? 0 : 1;
        return aHit - bHit;
      });
      for (const u of sorted.slice(0, perLevel)) {
        if (process.env.DEBUG_EURILCA_WALK) console.log(`[walk d=${depth}] ${u}`);
        const r = await walk(u);
        next.push(...r);
      }
      if (next.length) await walkRec(next, depth - 1, perLevel);
    };
    // Guesses go first — they're targeted at the canonical archive page that
    // holds the eurilca.eu/eurilca-europeans.org link. hop1's nextHops are
    // often menu items (other years' archives) that lead nowhere useful.
    await walkRec([...guessUrls, ...hop1.slice(0, 4)], 4, 12);

    // Name-guess: derive plausible per-year subdomain on eurilca-europeans.org
    // when the regatta name encodes a known fleet-type. Only for events the
    // adapter would otherwise miss (no ILCA 7 PDFs found).
    if (out.length === 0) {
      const types: string[] = [];
      if (/\bsenior\b/.test(name)) types.push("senior");
      if (/\bmaster/.test(name)) types.push("master");
      if (/\bunder[\s-]?21\b|\bu21\b/.test(name)) types.push("under21");
      for (const t of types) {
        out.push(`https://${year}-${t}.eurilca-europeans.org/`);
      }
    }

    return out;
  },
};

// ---------------------------------------------------------------------------
// Kieler Woche / Manage2Sail derivation — Kieler Woche scores via M2S since
// 2018+ with deterministic event slug `kiwo{YYYY}`. The page is JS-rendered
// so the existing playwright extractor must handle it; we just propose the
// URL into discovery.
// ---------------------------------------------------------------------------
const KIELER_M2S_ADAPTER: SiteAdapter = {
  name: "kieler-woche-m2s",
  matches: (event) => /\bkieler-woche\.(?:de|com)\b/i.test(event.regattaWebsite ?? ""),
  derive: async (event) => {
    const year = new Date(event.startDate).getUTCFullYear();
    const yy = String(year).slice(2); // 2018 → "18"
    // Pre-2020 events used the 2-digit form (kiwo18, kiwo19); 2020+ uses
    // the 4-digit form (kiwo2022, kiwo2025). Emit both so M2S resolves
    // whichever exists for this edition.
    return [
      `https://www.manage2sail.com/en-US/event/kiwo${year}`,
      `https://www.manage2sail.com/en-US/event/kiwo${yy}`,
    ];
  },
};

// ---------------------------------------------------------------------------
// Allianz Regatta / Dutch Water Week — allianzregatta.org redirects to
// dutchwaterweek.com (marketing site). Results live on Manage2Sail with
// deterministic slug `AR{YY}` (e.g., 2021 → AR21).
// ---------------------------------------------------------------------------
const ALLIANZ_M2S_ADAPTER: SiteAdapter = {
  name: "allianz-regatta-m2s",
  matches: (event) => {
    const site = event.regattaWebsite ?? "";
    const name = event.regattaName ?? "";
    return (
      /\b(?:allianzregatta\.org|dutchwaterweek\.com)\b/i.test(site) ||
      /\bAllianz Regatta\b/i.test(name)
    );
  },
  derive: async (event) => {
    const year = new Date(event.startDate).getUTCFullYear();
    const yy = String(year).slice(2);
    return [`https://www.manage2sail.com/en-US/event/AR${yy}`];
  },
};

// ---------------------------------------------------------------------------
// Laser International (sailing.laserinternational.org) adapter — the ILCA
// federation's pre-2022 event archive. Each event sits at
// `/public/site/event-site/{N}` and embeds direct links labeled "Results"
// pointing at result HTMLs or PDFs (under `/regattauploads/` or the per-year
// laser-worlds.com subdomain). The result links are present in static HTML —
// no JS rendering needed — so we just emit each href found in a "Results"
// anchor.
// ---------------------------------------------------------------------------
const LASERINTERNATIONAL_ADAPTER: SiteAdapter = {
  name: "laserinternational-event-site",
  matches: (event) =>
    /\bsailing\.laserinternational\.org\/public\/site\/event-site\/\d+/i.test(
      event.regattaWebsite ?? "",
    ),
  derive: async (event) => {
    const homepage = ensureProtocol(event.regattaWebsite!);
    const html = await fetchHtml(homepage);
    if (!html) return [];
    const out: string[] = [];
    let dom: JSDOM;
    try {
      dom = new JSDOM(html);
    } catch {
      return [];
    }
    for (const a of Array.from(dom.window.document.querySelectorAll("a[href]")) as Element[]) {
      const text = (a.textContent ?? "").trim();
      const href = a.getAttribute("href") ?? "";
      if (!href || href === "#" || href.startsWith("#")) continue;
      // The page uses two layouts:
      //   (a) `<a>Results</a>` with the URL pointing at a results PDF/HTML
      //   (b) `<a>Men</a>` / `<a>Women</a>` under a "Results" header — the
      //       URL contains "Results" plus a gender/class hint.
      // Accept either the link-text shape or a results-shaped href that
      // doesn't belong to a sibling fleet.
      const looksLikeResultText =
        /^results?$/i.test(text) ||
        /^(men|standard|ilca\s*7)$/i.test(text);
      const looksLikeResultHref = /\bResult/i.test(href) && /\.(?:pdf|html?)$/i.test(href);
      if (!looksLikeResultText && !looksLikeResultHref) continue;
      try {
        const u = new URL(href, homepage).toString();
        // Filter out radial/women/under-17 sibling fleets — same page
        // typically links all classes side by side.
        if (/(?:Rdl|Radial|Women|6\.7|4\.7)/i.test(u)) continue;
        if (!out.includes(u)) out.push(u);
      } catch {
        // skip
      }
    }
    return out;
  },
};

// ---------------------------------------------------------------------------
// Vilamoura Sailing / Portugal Grand Prix adapter — Vilamoura's result
// portal is on vilamourasailing.sailti.com (Sailti SaaS), not the marketing
// site WS records (vilamourasailing.com). Each Portugal Grand Prix edition
// uses a deterministic slug `{edition}PGPR{round}`:
//
//   "5th Portugal Grand Prix - Round 1" (2022-12) → 5PGPR1
//   "6th Portugal Grand Prix - Round 1" (2023-12) → 6PGPR1
//   "7th Portugal Grand Prix - Round 2" (2025-02) → 7PGPR2
//   "8th Portugal Grand Prix - Round 1" (2025-12) → 8PGPR1
//   "8th Portugal Grand Prix - Round 2" (2026-02) → 8PGPR2
//
// The race? landing page renders class icons whose click handlers contain
// the actual results AJAX URL: `resultsajax?id={raceId}&idsc2r={classKey}`.
// We fetch the landing page, locate the ILCA-7 (`ilca-7` class) handler, and
// extract both IDs to build the deterministic results-data URL with
// `allResults=1&docLimit=300` so the full scoreboard renders into our HTML
// extractor. Without those IDs the bare race-resultsall URL serves a stub
// page only — the class icons are JS-only, so a static fetch returns
// nothing useful.
// ---------------------------------------------------------------------------
const VILAMOURA_PGP_ADAPTER: SiteAdapter = {
  name: "vilamoura-pgp",
  matches: (event) => {
    const site = event.regattaWebsite ?? "";
    const name = event.regattaName ?? "";
    const isVilamoura = /\bvilamourasailing\.com\b/i.test(site);
    const isPgp = /\bportugal\s+grand\s+prix\b/i.test(name);
    return isVilamoura || isPgp;
  },
  derive: async (event) => {
    const out: string[] = [];
    const name = event.regattaName ?? "";
    const editionMatch = name.match(/(\d+)(?:st|nd|rd|th)\s+Portugal\s+Grand\s+Prix/i);
    const roundMatch = name.match(/Round\s+(\d+)/i);
    if (!editionMatch || !roundMatch) return [];
    const slug = `${editionMatch[1]}PGPR${roundMatch[1]}`;
    const racePage = `https://vilamourasailing.sailti.com/en/default/races/race?text=${slug}-en`;
    const html = await fetchHtml(racePage);
    if (html) {
      // The ILCA 7 class icon has id `mnResults{idClass}_{raceId}` and the
      // immediately following click handler script line carries the AJAX URL
      // we want. Locate the ilca-7 anchor first, then extract the next
      // resultsajax URL emitted in the same script block.
      const ilca7Match = html.match(/id="mnResults(\d+)_(\d+)"[^>]*ilca-7/i);
      if (ilca7Match) {
        const idClass = ilca7Match[1];
        const raceId = ilca7Match[2];
        const handlerRe = new RegExp(
          `mnResults${idClass}_${raceId}'\\)\\.click[\\s\\S]*?resultsajax\\?id=${raceId}&idsc2r=(\\d+)`,
          "i",
        );
        const handler = html.match(handlerRe);
        if (handler) {
          const idsc2r = handler[1];
          out.push(
            `https://vilamourasailing.sailti.com/en/default/races/resultsajax?id=${raceId}&idsc2r=${idsc2r}&allResults=1&handicap=&docLimit=300`,
          );
        }
      }
    }
    // Fallback to the human-readable result pages even if ID lookup failed —
    // Playwright extraction may still render something useful.
    out.push(
      `https://vilamourasailing.sailti.com/en/default/races/race-resultsall?text=${slug}-en&menuaction=calendar`,
    );
    out.push(racePage);
    return out;
  },
};

// ---------------------------------------------------------------------------
// Regatta Network adapter — regattanetwork.com hosts result tables in an
// iframe pointed at `applet_regatta_results.php?regatta_id=N`. The event
// home URL takes one of two shapes:
//   - http://www.regattanetwork.com/event/15457#_home
//   - http://www.regattanetwork.com/event/index.php?regatta_id=15457
// The applet URL returns a static HTML scoreboard our generic extractor can
// score directly — no SPA, no iframe walking needed.
// ---------------------------------------------------------------------------
const REGATTANETWORK_ADAPTER: SiteAdapter = {
  name: "regattanetwork",
  matches: (event) => /\bregattanetwork\.com\b/i.test(event.regattaWebsite ?? ""),
  derive: async (event) => {
    const site = event.regattaWebsite ?? "";
    const out: string[] = [];
    const m1 = site.match(/regattanetwork\.com\/event\/(\d+)/i);
    const m2 = site.match(/regatta_id=(\d+)/i);
    const id = m1?.[1] ?? m2?.[1];
    if (id) {
      out.push(`https://www.regattanetwork.com/clubmgmt/applet_regatta_results.php?regatta_id=${id}`);
    }
    return out;
  },
};

// ---------------------------------------------------------------------------
// Generic "Results" menu adapter — catches any regatta site that follows the
// near-universal convention of a top-level menu/nav link labeled exactly
// "Results" / "Standings" / "Classifications". Runs on every event with a
// regattaWebsite; the orchestrator skips it when a more specific adapter
// already produced URLs (specific-wins-over-generic).
//
// Cost is one extra HTTP fetch per event. We deliberately match only short,
// navigation-style anchor labels (not "See all results" marketing copy) to
// keep precision high, and we run candidates through the same fleet-folder
// rejection used by the ILCA microsite adapter.
// ---------------------------------------------------------------------------
const GENERIC_RESULTS_LINK_ADAPTER: SiteAdapter = {
  name: "generic-results-link",
  matches: (event) => Boolean(event.regattaWebsite),
  derive: async (event) => {
    const homepage = ensureProtocol(event.regattaWebsite!);
    const html = await fetchHtml(homepage);
    if (!html) return [];
    let dom: JSDOM;
    try {
      dom = new JSDOM(html);
    } catch {
      return [];
    }
    const doc = dom.window.document;
    const out: string[] = [];
    const seen = new Set<string>();
    const fleetFolderRe = /^(.*masters?|optim?i?st|radial|29er|420|opti)$/;

    const candidates = Array.from(doc.querySelectorAll("a[href]")) as Element[];
    for (const a of candidates) {
      const text = (a.textContent ?? "").trim();
      const href = a.getAttribute("href") ?? "";
      if (!href) continue;
      const isMenuResult =
        /^(final\s+)?results?$/i.test(text) ||
        /^standings$/i.test(text) ||
        /^(race[-\s]?)?results$/i.test(text) ||
        /^classifications?$/i.test(text) ||
        // Multilingual: German "Ergebnisse", Italian "Risultati",
        // Spanish "Resultados", French "Résultats", Portuguese "Resultados".
        // Required for kieler-woche.de, ilcaitalia.com, ffvoile.fr, etc.
        /^ergebnisse$/i.test(text) ||
        /^risultati$/i.test(text) ||
        /^resultados$/i.test(text) ||
        /^résultats$/i.test(text);
      if (!isMenuResult) continue;
      try {
        const u = new URL(href, homepage).toString();
        if (seen.has(u)) continue;
        // Reject menu links that resolve into a non-ILCA-7 fleet folder.
        const path = new URL(u).pathname.toLowerCase();
        const segs = path.split("/").filter(Boolean);
        if (segs.slice(0, -1).some((s) => fleetFolderRe.test(s))) continue;
        seen.add(u);
        out.push(u);
      } catch {
        // skip
      }
    }
    return out;
  },
};

// ---------------------------------------------------------------------------
// Trofeo Princesa Sofia / generic year-subdomain adapter.
//
// Several Spanish/sailing sites keep an "always-current" main domain
// (www.trofeoprincesasofia.org) plus per-year subdomains
// ({YYYY}.trofeoprincesasofia.org). WS records always store the bare main
// domain regardless of edition, so all five Sofia events (2022–2026) point
// at the same URL — and the sailti class-PDF resolver returns the LATEST
// edition's PDF for every one. Fix: walk the main domain's "Past editions"
// page, find the matching year subdomain, and emit
// `{year}.trofeoprincesasofia.org/en/default/races/race-resultsall` as the
// canonical per-year results landing.
// ---------------------------------------------------------------------------
const SOFIA_PER_YEAR_ADAPTER: SiteAdapter = {
  name: "sofia-per-year",
  matches: (event) => /\btrofeoprincesasofia\.org\b/i.test(event.regattaWebsite ?? ""),
  derive: async (event) => {
    const year = new Date(event.startDate).getUTCFullYear();
    // For the current edition WS often points directly at the main domain,
    // and the per-year subdomain may not yet exist; emit the main results
    // page as a fallback.
    const out: string[] = [];
    out.push(`https://${year}.trofeoprincesasofia.org/en/default/races/race-resultsall`);
    out.push(`https://${year}.trofeoprincesasofia.org/`);
    // Fallback: walk the past-editions index in case the templated URL above
    // 404s for an outlier year (e.g. pre-2021 used different subdomain shapes).
    try {
      const idxHtml = await fetchHtml("https://www.trofeoprincesasofia.org/en/default/races/race-past-editions");
      if (idxHtml) {
        const dom = new JSDOM(idxHtml);
        const yearStr = String(year);
        for (const a of Array.from(dom.window.document.querySelectorAll("a[href]")) as Element[]) {
          const href = a.getAttribute("href") ?? "";
          if (href.includes(yearStr) && /trofeoprincesasofia\.org/.test(href)) {
            try {
              const u = new URL(href, "https://www.trofeoprincesasofia.org/").toString();
              if (!out.includes(u)) out.push(u);
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* best-effort */ }
    return out;
  },
};

// ---------------------------------------------------------------------------
// Registration. Order matters insofar as adapter names show up in candidate
// notes; the actual URL list is the union across all matches.
// ---------------------------------------------------------------------------
export const ADAPTERS: SiteAdapter[] = [
  CORK_ADAPTER,
  ILCA_MICROSITE_ADAPTER,
  EURILCA_BLOG_ADAPTER,
  KIELER_M2S_ADAPTER,
  ALLIANZ_M2S_ADAPTER,
  LASERINTERNATIONAL_ADAPTER,
  REGATTANETWORK_ADAPTER,
  VILAMOURA_PGP_ADAPTER,
  SOFIA_PER_YEAR_ADAPTER,
  GENERIC_RESULTS_LINK_ADAPTER,
];

/**
 * Run every adapter that matches the event and return the unioned list of
 * derived URLs (deduped, in adapter-priority order). The generic adapter is
 * only consulted when no site-specific adapter produced URLs — specific
 * wins over generic, so we don't waste an extra HTTP fetch when CORK or the
 * ILCA microsite adapter already deep-linked the right page.
 */
export async function deriveAdapterUrls(event: WSEventLite): Promise<DiscoveredUrl[]> {
  const out: DiscoveredUrl[] = [];
  const seen = new Set<string>();
  for (const adapter of ADAPTERS) {
    if (adapter === GENERIC_RESULTS_LINK_ADAPTER && out.length > 0) continue;
    if (!adapter.matches(event)) continue;
    let urls: string[] = [];
    try {
      urls = await adapter.derive(event);
    } catch {
      continue;
    }
    for (const u of urls) {
      if (seen.has(u)) continue;
      seen.add(u);
      out.push({ url: u, source: "adapter" });
    }
  }
  return out;
}
