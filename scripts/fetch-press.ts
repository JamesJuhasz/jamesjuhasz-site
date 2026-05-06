/*
  scripts/fetch-press.ts
  ---------------------------------------------------------------------------
  Daily press scraper. Pulls per-publication RSS feeds (Sail-World, Scuttlebutt,
  afloat.ie, Sail Canada, etc.) and Google News searches. For RSS items that
  don't mention the name in the title/description, the article HTML is fetched
  and the body searched. URLs that don't match are persisted to `denylist` so
  subsequent runs skip them without re-fetching.

  Run:
    npm run press:fetch
    npx tsx scripts/fetch-press.ts --dry    # don't write, just print
*/

import { JSDOM } from "jsdom";
import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_FILE = path.join(PROJECT_ROOT, "src", "data", "press-auto.json");

const args = {
  dry: process.argv.includes("--dry"),
  backfillImages: process.argv.includes("--backfill-images"),
};

type FeedSource = { url: string; publication: string; resolveImage: boolean };

const FEEDS: FeedSource[] = [
  { url: "https://www.sail-world.com/rss/", publication: "Sail-World.com", resolveImage: true },
  { url: "https://www.sailingscuttlebutt.com/feed/", publication: "Scuttlebutt Sailing News", resolveImage: true },
  { url: "https://afloat.ie/index.php?format=feed&type=rss", publication: "Afloat.ie", resolveImage: true },
  { url: "https://www.sailing.ca/feed/", publication: "Sail Canada", resolveImage: true },
  { url: "https://sailingfast.co.uk/feed", publication: "Sailing Fast", resolveImage: true },
];

const GOOGLE_NEWS_QUERIES = [
  '"James Juhasz"',
  '"James Juhasz" sailing',
  '"James Juhasz" ILCA',
  '"James Juhasz" Olympic',
  '"James Juhasz" Canada',
  '"James Juhasz" Oakville',
  '"James Juhasz" regatta',
  '"James Juhasz" worlds',
  '"James Juhasz" 2024',
  '"James Juhasz" 2025',
  '"James Juhasz" 2026',
  'Juhasz Oakville sailing',
  'Juhasz Canadian sailing team',
  'Juhasz ILCA 7',
];

const NAME_NEEDLE = "juhasz";
const MAX_NEW_PER_RUN = 60;
const EXCERPT_MAX = 280;
const ARTICLE_FETCH_TIMEOUT_MS = 12_000;
const BODY_FETCH_CONCURRENCY = 4;

// Topical filter: drops same-name false positives (obituaries, unrelated
// people) that slip through Google News when the query lacks a sailing modifier.
// Applied to title + description, not body.
const SAILING_KEYWORDS = [
  "sail", "ilca", "laser", "olymp", "paralymp",
  "regatta", "yacht", "boat", "fleet", "skipper", "helm",
  "race day", "racing", "world champ", "worlds", "world cup",
  "canad", "oakville", "hyères", "palma", "marseille",
  "paris 2024", "la 2028", "la28",
];

function looksSailingRelated(text: string): boolean {
  const lc = text.toLowerCase();
  return SAILING_KEYWORDS.some((kw) => lc.includes(kw));
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

type AutoItem = {
  publication: string;
  articleTitle: string;
  publishedAt: string;
  externalUrl: string;
  excerpt?: string;
  imageUrl?: string;
  discoveredAt: string;
};

type AutoFile = {
  items: AutoItem[];
  denylist: string[];
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

// NFD-decompose + strip combining marks so "Juhász" matches "juhasz".
function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function nameMatches(s: string): boolean {
  return normalizeForMatch(s).includes(NAME_NEEDLE);
}

function bodyMentionsName(html: string): boolean {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return nameMatches(text);
}

// Strip trailing " - Publication Name" suffix that Google News appends to titles.
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+-\s+\S.*$/, "")
    .trim();
}

function toIsoDate(rfc822: string | null | undefined): string | null {
  if (!rfc822) return null;
  const d = new Date(rfc822);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function absoluteUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

// Best-effort decode of Google News RSS article URLs. The path format is
// /rss/articles/<base64-protobuf>?oc=5 — decoding usually exposes the publisher
// URL as a UTF-8 substring inside the protobuf payload.
function decodeGoogleNewsUrl(url: string): string | null {
  const m = url.match(/\/articles\/([^?\/]+)/);
  if (!m) return null;
  try {
    let encoded = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (encoded.length % 4) encoded += "=";
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const urlMatch = decoded.match(/https?:\/\/[^\s\x00-\x1f"<>]+/);
    if (!urlMatch) return null;
    const candidate = urlMatch[0];
    if (candidate.includes("news.google.com")) return null;
    return candidate;
  } catch {
    return null;
  }
}

async function readAutoFile(): Promise<AutoFile> {
  if (!existsSync(DATA_FILE)) {
    return { items: [], denylist: [] };
  }
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<AutoFile>;
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    denylist: Array.isArray(parsed.denylist) ? parsed.denylist : [],
  };
}

async function writeAutoFile(file: AutoFile) {
  const tmp = DATA_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(file, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

type RssItem = {
  title: string;
  link: string;
  pubDate: string | null;
  description: string;
  fullText: string;
  source: string;
  enclosureUrl: string | null;
};

async function fetchFeed(url: string): Promise<RssItem[]> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": UA } });
  } catch (err) {
    console.warn(`[fetch-press] feed ${url}: ${(err as Error).message}`);
    return [];
  }
  if (!res.ok) {
    console.warn(`[fetch-press] feed ${url}: HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const items = Array.from(doc.querySelectorAll("item")) as Element[];
  return items.map((node): RssItem => ({
    title: node.querySelector("title")?.textContent ?? "",
    link: node.querySelector("link")?.textContent ?? "",
    pubDate: node.querySelector("pubDate")?.textContent ?? null,
    description: node.querySelector("description")?.textContent ?? "",
    fullText: node.textContent ?? "",
    source: node.querySelector("source")?.textContent ?? "",
    enclosureUrl: node.querySelector("enclosure")?.getAttribute("url") ?? null,
  }));
}

function googleNewsRssUrl(query: string) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

async function fetchHtmlAndUrl(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ARTICLE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return { html: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  return (await fetchHtmlAndUrl(url))?.html ?? null;
}

function extractImage(
  html: string,
  articleUrl: string,
  publishedAt: string,
): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i);
  if (og?.[1]) return absoluteUrl(decodeEntities(og[1]), articleUrl);

  const twitter =
    html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);
  if (twitter?.[1]) return absoluteUrl(decodeEntities(twitter[1]), articleUrl);

  const linkImage = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (linkImage?.[1]) return absoluteUrl(decodeEntities(linkImage[1]), articleUrl);

  // Fallback: first <img> whose src path contains the article's year/month
  // (matches WordPress wp-content/uploads/YYYY/MM/ pattern for the article hero).
  const yearMonth = publishedAt.slice(0, 7).replace("-", "/");
  let articleHost: string;
  try {
    articleHost = new URL(articleUrl).host;
  } catch {
    return null;
  }
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const src = decodeEntities(m[1]);
    if (!src.includes(yearMonth)) continue;
    const abs = absoluteUrl(src, articleUrl);
    try {
      if (new URL(abs).host === articleHost) return abs;
    } catch {
      // ignore
    }
  }
  return null;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => next()),
  );
  return results;
}

type Source = {
  url: string;
  publication: string | null;
  resolveImage: boolean;
  requireNameMatch: boolean;
  bodyFetchOnMiss: boolean;
};

type Candidate = {
  src: Source;
  item: RssItem;
  link: string;
  publishedAt: string;
};

type Resolved = {
  cand: Candidate;
  accept: boolean;
  reason:
    | "rss-match"
    | "no-match-required"
    | "body-match"
    | "body-miss"
    | "body-fetch-failed";
  html?: string;
};

async function main() {
  if (args.backfillImages) {
    await backfillImages();
    return;
  }

  const file = await readAutoFile();
  const seenUrls = new Set(file.items.map((i) => i.externalUrl));
  const denylist = new Set(file.denylist);

  let fetchedTotal = 0;
  let dedupeSkips = 0;
  let dateSkips = 0;
  let denyHits = 0;
  let bodyFetches = 0;
  let bodyMatches = 0;
  let bodyMisses = 0;

  const sources: Source[] = [
    ...FEEDS.map<Source>((f) => ({
      url: f.url,
      publication: f.publication,
      resolveImage: f.resolveImage,
      requireNameMatch: true,
      bodyFetchOnMiss: true,
    })),
    ...GOOGLE_NEWS_QUERIES.map<Source>((q) => ({
      url: googleNewsRssUrl(q),
      publication: null,
      resolveImage: false,
      requireNameMatch: false,
      bodyFetchOnMiss: false,
    })),
  ];

  const candidates: Candidate[] = [];

  for (const src of sources) {
    const items = await fetchFeed(src.url);
    fetchedTotal += items.length;

    for (const item of items) {
      let link = item.link.trim();
      if (!link) continue;

      // Best-effort: replace Google News redirect with publisher URL.
      if (link.includes("news.google.com")) {
        const decoded = decodeGoogleNewsUrl(link);
        if (decoded) link = decoded;
      }

      const isDenied = Array.from(denylist).some(
        (needle) => needle && link.includes(needle),
      );
      if (isDenied) {
        denyHits++;
        continue;
      }
      if (seenUrls.has(link)) {
        dedupeSkips++;
        continue;
      }

      const publishedAt = toIsoDate(item.pubDate);
      if (!publishedAt) {
        dateSkips++;
        continue;
      }

      candidates.push({ src, item, link, publishedAt });
    }
  }

  // Cross-feed dedupe: an article surfaced via both an RSS feed and Google News
  // (publisher URL after decoding) collapses to one candidate. Prefer the entry
  // from the source with resolveImage = true, since image extraction works
  // better against the publisher's own feed.
  // URL-level dedup: prefer resolveImage sources.
  const candByUrl = new Map<string, Candidate>();
  for (const c of candidates) {
    const existing = candByUrl.get(c.link);
    if (!existing) candByUrl.set(c.link, c);
    else if (!existing.src.resolveImage && c.src.resolveImage) {
      candByUrl.set(c.link, c);
    }
  }

  // Title-level dedup: same story covered by multiple publications. Keep the
  // candidate from a named/resolveImage source over a Google News one.
  const candByTitle = new Map<string, Candidate>();
  for (const c of Array.from(candByUrl.values())) {
    const key = normalizeTitle(stripHtml(c.item.title));
    const existing = candByTitle.get(key);
    if (!existing) {
      candByTitle.set(key, c);
    } else if (!existing.src.resolveImage && c.src.resolveImage) {
      candByTitle.set(key, c);
    } else if (!existing.src.publication && c.src.publication) {
      candByTitle.set(key, c);
    }
  }
  const uniqueCandidates = Array.from(candByTitle.values());

  console.log(
    `[fetch-press] ${fetchedTotal} items across ${sources.length} sources → ${uniqueCandidates.length} candidates`,
  );

  // Pass 1: name match in RSS text — fast.
  const resolved: Resolved[] = [];
  const needsBody: Candidate[] = [];

  let topicalRejects = 0;
  for (const c of uniqueCandidates) {
    const titleAndDesc = `${c.item.title} ${c.item.description}`;
    const matchedInRss = nameMatches(c.item.fullText);

    if (matchedInRss) {
      // Even on a name match, drop if there's zero sailing context — protects
      // against same-name false positives (obituaries, arrests, etc.) coming
      // through unqualified Google News queries.
      if (c.src.requireNameMatch || looksSailingRelated(titleAndDesc)) {
        resolved.push({ cand: c, accept: true, reason: "rss-match" });
      } else {
        topicalRejects++;
        resolved.push({ cand: c, accept: false, reason: "body-miss" });
      }
    } else if (!c.src.requireNameMatch) {
      // Google News path — Google's quoted-search vouches for the name; we
      // only require sailing context to reject same-name noise.
      if (looksSailingRelated(titleAndDesc)) {
        resolved.push({ cand: c, accept: true, reason: "no-match-required" });
      } else {
        topicalRejects++;
        resolved.push({ cand: c, accept: false, reason: "body-miss" });
      }
    } else if (c.src.bodyFetchOnMiss) {
      needsBody.push(c);
    } else {
      resolved.push({ cand: c, accept: false, reason: "body-miss" });
    }
  }

  // Pass 2: body-fetch the candidates that didn't match in RSS text.
  if (needsBody.length > 0) {
    console.log(
      `[fetch-press] body-fetching ${needsBody.length} candidates @ concurrency ${BODY_FETCH_CONCURRENCY}…`,
    );
    const results = await runWithConcurrency(
      needsBody,
      BODY_FETCH_CONCURRENCY,
      async (c): Promise<Resolved> => {
        bodyFetches++;
        const html = await fetchHtml(c.link);
        if (!html) return { cand: c, accept: false, reason: "body-fetch-failed" };
        if (bodyMentionsName(html)) {
          bodyMatches++;
          return { cand: c, accept: true, reason: "body-match", html };
        }
        bodyMisses++;
        return { cand: c, accept: false, reason: "body-miss" };
      },
    );
    resolved.push(...results);
  }

  // Persist body-misses to denylist so future runs skip them without re-fetching.
  let newlyDenied = 0;
  for (const r of resolved) {
    if (r.reason === "body-miss") {
      if (!denylist.has(r.cand.link)) {
        denylist.add(r.cand.link);
        newlyDenied++;
      }
    }
  }

  // Pass 3: build entries for accepted candidates, resolving images.
  const accepted = resolved.filter((r) => r.accept);
  const fresh: AutoItem[] = [];

  for (const r of accepted) {
    const c = r.cand;
    const title = stripHtml(c.item.title);
    const description = stripHtml(c.item.description);

    let imageUrl: string | undefined;
    let effectiveUrl = c.link;

    if (effectiveUrl.includes("news.google.com")) {
      // Follow the Google News redirect to get the real publisher URL + HTML.
      const result = await fetchHtmlAndUrl(effectiveUrl);
      if (result && !result.finalUrl.includes("news.google.com")) {
        effectiveUrl = result.finalUrl;
        const img = extractImage(result.html, effectiveUrl, c.publishedAt);
        if (img) imageUrl = img;
      }
    } else {
      if (c.item.enclosureUrl) {
        imageUrl = absoluteUrl(c.item.enclosureUrl, effectiveUrl);
      } else {
        const html = r.html ?? (await fetchHtml(effectiveUrl));
        if (html) {
          const img = extractImage(html, effectiveUrl, c.publishedAt);
          if (img) imageUrl = img;
        }
      }
    }

    const publication = c.src.publication ?? stripHtml(c.item.source) ?? "Unknown";

    fresh.push({
      publication,
      articleTitle: title,
      publishedAt: c.publishedAt,
      externalUrl: effectiveUrl,
      excerpt: description ? truncate(description, EXCERPT_MAX) : undefined,
      imageUrl,
      discoveredAt: new Date().toISOString(),
    });
  }

  let newEntries = fresh;
  if (fresh.length > MAX_NEW_PER_RUN) {
    console.warn(
      `[fetch-press] safety cap: found ${fresh.length} new entries, only writing first ${MAX_NEW_PER_RUN}. Inspect manually.`,
    );
    newEntries = fresh.slice(0, MAX_NEW_PER_RUN);
  }

  const merged = [...file.items, ...newEntries].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  );

  console.log(
    `[fetch-press] new ${newEntries.length} | body-fetches ${bodyFetches} (matches ${bodyMatches}, misses ${bodyMisses}, fails ${bodyFetches - bodyMatches - bodyMisses}) | dedupe ${dedupeSkips} | denylist ${denyHits} (added ${newlyDenied}) | topical-rejects ${topicalRejects} | date-skips ${dateSkips}`,
  );

  if (newEntries.length === 0 && newlyDenied === 0) {
    console.log("[fetch-press] no new entries — leaving file unchanged.");
    return;
  }

  for (const entry of newEntries) {
    const img = entry.imageUrl ? " 🖼" : "";
    console.log(
      `  + ${entry.publishedAt}  ${entry.publication}  —  ${entry.articleTitle}${img}`,
    );
  }

  if (args.dry) {
    console.log("[fetch-press] --dry: not writing.");
    return;
  }

  await writeAutoFile({ items: merged, denylist: Array.from(denylist).sort() });
  console.log(`[fetch-press] wrote ${DATA_FILE}`);
}

// Publication name → primary domain used for DDG site: filter.
const PUB_DOMAINS: Record<string, string> = {
  "sail-world.com": "sail-world.com",
  "sail canada": "sailing.ca",
  "scuttlebutt sailing news": "sailingscuttlebutt.com",
  "scuttlebutt": "sailingscuttlebutt.com",
  "afloat.ie": "afloat.ie",
  "sailweb": "sailweb.co.uk",
  "inhalton": "inhalton.com",
  "inhalton.com": "inhalton.com",
  "oakville news": "inhalton.com",
  "toronto guardian": "torontoguardian.com",
  "québec yachting": "quebecyachting.ca",
  "quebec yachting": "quebecyachting.ca",
};

function pubDomain(publication: string): string | null {
  return PUB_DOMAINS[publication.toLowerCase().trim()] ?? null;
}

async function searchDDG(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/uddg=([^&"]+)/g)];
    return [...new Set(matches.map((m) => decodeURIComponent(m[1])))];
  } catch {
    return [];
  }
}

async function backfillImages() {
  const file = await readAutoFile();
  const missing = file.items.filter((i) => !i.imageUrl);
  if (missing.length === 0) {
    console.log("[fetch-press] backfill: no items missing images.");
    return;
  }
  console.log(`[fetch-press] backfill: resolving ${missing.length} items via DDG search…`);

  let filled = 0;
  let notFound = 0;

  for (const item of missing) {
    const cleanTitle = item.articleTitle.replace(/\s+-\s+\S.*$/, "").trim();
    const domain = pubDomain(item.publication);

    // Use first ~8 words as unquoted keywords — DDG blocks exact-phrase + site: combos.
    const keywords = cleanTitle.split(/\s+/).slice(0, 8).join(" ");
    const query = domain
      ? `site:${domain} ${keywords}`
      : `${keywords} ${item.publication}`;

    const urls = await searchDDG(query);
    let match = domain
      ? urls.find((u) => u.includes(domain))
      : urls[0];

    // Fallback: drop site: filter and just search keywords + publication.
    if (!match && domain) {
      const fallbackUrls = await searchDDG(`${keywords} ${item.publication}`);
      match = fallbackUrls.find((u) => u.includes(domain));
      await new Promise((r) => setTimeout(r, 1100));
    }

    if (match) {
      const result = await fetchHtmlAndUrl(match);
      if (result) {
        const img = extractImage(result.html, result.finalUrl, item.publishedAt);
        if (img) {
          item.imageUrl = img;
          item.externalUrl = result.finalUrl;
          filled++;
          console.log(`  ✓ ${item.publication} — ${cleanTitle.slice(0, 55)}`);
        } else {
          console.log(`  ~ no og:image: ${item.publication} — ${cleanTitle.slice(0, 55)}`);
        }
      }
    } else {
      notFound++;
      console.log(`  ✗ DDG miss: ${item.publication} — ${cleanTitle.slice(0, 55)}`);
    }

    // Rate-limit: ~1 DDG req/sec.
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`[fetch-press] backfill: filled ${filled} | not found ${notFound} | no-image ${missing.length - filled - notFound}`);
  if (!args.dry && filled > 0) {
    await writeAutoFile(file);
    console.log(`[fetch-press] backfill: wrote ${DATA_FILE}`);
  }
}

main().catch((err) => {
  console.error("[fetch-press] failed:", err);
  process.exit(1);
});
