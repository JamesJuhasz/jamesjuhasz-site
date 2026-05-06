/*
  scripts/fetch-results.ts
  ---------------------------------------------------------------------------
  Daily results scraper. Pulls past race events from CoachAible (the
  authoritative race calendar) and, for each one, attempts to find the public
  results page via Google News RSS, fetch it, and parse out James's placement.
  Writes enrichments to src/data/results-auto.json (idempotent merge).

  Run:
    npm run results:fetch
    npx tsx scripts/fetch-results.ts --dry          # don't write, just print
    npx tsx scripts/fetch-results.ts --limit=5      # only process 5 races
*/

import { JSDOM } from "jsdom";
import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_FILE = path.join(PROJECT_ROOT, "src", "data", "results-auto.json");

const args = {
  dry: process.argv.includes("--dry"),
  limit: (() => {
    const m = process.argv.find((a) => a.startsWith("--limit="));
    if (!m) return Infinity;
    const n = Number(m.split("=")[1]);
    return Number.isFinite(n) && n > 0 ? n : Infinity;
  })(),
};

const NAME_NEEDLE = "juhasz";
const STATS_WINDOW_DAYS = 730;
const RESCRAPE_AFTER_DAYS = 90;
const MAX_NEW_PER_RUN = 25;
const MAX_CANDIDATES_PER_RACE = 8;
const ARTICLE_FETCH_TIMEOUT_MS = 12_000;
const COACHAIBLE_TIMEOUT_MS = 15_000;

const PREFERRED_HOSTS = [
  "manage2sail.com",
  "sailwave.com",
  "sailing.org",
  "raceqs.com",
  "yachtscoring.com",
  "regattanetwork.com",
  "trofeoprincesasofia.org",
  "semaineolympique.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

type CoachaibleRawEvent = {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  eventType: "race" | "training" | "travel" | "rest" | "other";
  racePriority: string | null;
  notes?: string;
};

type CoachaibleStatsResponse = {
  events: CoachaibleRawEvent[];
};

type ConsolidatedRace = {
  coachaibleId: string;
  title: string;
  startDate: string;
  endDate: string;
};

type ScrapedResult = {
  coachaibleId: string;
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
  externalUrl: string | null;
  source: string | null;
  scrapedAt: string | null;
};

type ResultsAutoFile = {
  items: ScrapedResult[];
  denylist: string[];
};

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

function dayDiff(a: string, b: string): number {
  const aMs = new Date(`${a}T00:00:00Z`).getTime();
  const bMs = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((bMs - aMs) / 86_400_000);
}

function consolidateRaces(events: CoachaibleRawEvent[]): ConsolidatedRace[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const groups: CoachaibleRawEvent[][] = [];
  for (const ev of sorted) {
    const last = groups[groups.length - 1];
    const lastEv = last?.[last.length - 1];
    if (
      lastEv &&
      normalizeTitle(lastEv.title) === normalizeTitle(ev.title) &&
      dayDiff(lastEv.endDate ?? lastEv.startDate, ev.startDate) <= 2
    ) {
      last.push(ev);
    } else {
      groups.push([ev]);
    }
  }
  return groups.map((g) => {
    const first = g[0];
    const last = g[g.length - 1];
    return {
      coachaibleId: `coachaible-${first.id}`,
      title: first.title,
      startDate: first.startDate,
      endDate: last.endDate ?? last.startDate,
    };
  });
}

async function readAutoFile(): Promise<ResultsAutoFile> {
  if (!existsSync(DATA_FILE)) return { items: [], denylist: [] };
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<ResultsAutoFile>;
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    denylist: Array.isArray(parsed.denylist) ? parsed.denylist : [],
  };
}

async function writeAutoFile(file: ResultsAutoFile) {
  const tmp = DATA_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(file, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

async function fetchCoachaible(): Promise<CoachaibleStatsResponse | null> {
  const base = process.env.COACHAIBLE_API_BASE?.replace(/\/$/, "");
  const token = process.env.COACHAIBLE_API_TOKEN;
  if (!base || !token) {
    console.warn(
      "[fetch-results] COACHAIBLE_API_BASE or COACHAIBLE_API_TOKEN missing — cannot fetch races.",
    );
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), COACHAIBLE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${base}/api/public/stats/training?days=${STATS_WINDOW_DAYS}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      },
    );
    if (!res.ok) {
      console.warn(`[fetch-results] coachaible HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as CoachaibleStatsResponse;
  } catch (err) {
    console.warn("[fetch-results] coachaible failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function googleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

async function fetchFeedLinks(url: string): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": UA } });
  } catch (err) {
    console.warn(`[fetch-results] feed ${url}: ${(err as Error).message}`);
    return [];
  }
  if (!res.ok) return [];
  const xml = await res.text();
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const items = Array.from(dom.window.document.querySelectorAll("item")) as Element[];
  return items
    .map((node) => node.querySelector("link")?.textContent?.trim() ?? "")
    .filter(Boolean);
}

function rankCandidates(urls: string[]): string[] {
  const scored = urls.map((u) => {
    let host = "";
    try {
      host = new URL(u).host.toLowerCase();
    } catch {
      return { u, score: -1 };
    }
    const score = PREFERRED_HOSTS.findIndex((h) => host.endsWith(h));
    return { u, score: score === -1 ? 999 : score };
  });
  return scored.sort((a, b) => a.score - b.score).map((s) => s.u);
}

type ParsedResult = {
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
};

function parseResultsHtml(html: string): ParsedResult {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  let position: string | null = null;
  let totalCompetitors: number | null = null;
  let fleet: string | null = null;

  const rows = Array.from(doc.querySelectorAll("tr")) as Element[];
  for (const row of rows) {
    const text = (row.textContent ?? "").toLowerCase();
    if (!text.includes(NAME_NEEDLE)) continue;
    const cells = Array.from(row.querySelectorAll("td")) as Element[];
    if (cells.length === 0) continue;
    for (const cell of cells) {
      const raw = (cell.textContent ?? "").trim();
      const m = raw.match(/^(\d{1,3})(?:st|nd|rd|th)?$/i);
      if (m) {
        const n = Number(m[1]);
        if (n >= 1 && n <= 500) {
          position = String(n);
          break;
        }
      }
    }
    if (position) {
      const table = row.closest("table");
      if (table) {
        const dataRows = (Array.from(table.querySelectorAll("tr")) as Element[]).filter(
          (r) => r.querySelectorAll("td").length > 0,
        );
        if (dataRows.length > 1) totalCompetitors = dataRows.length;
        const caption = table.querySelector("caption")?.textContent?.trim();
        if (caption) fleet = caption;
      }
      break;
    }
  }

  if (!fleet) {
    const h = doc.querySelector("h1")?.textContent?.trim();
    if (h && /ilca|laser|fleet|division/i.test(h)) fleet = h;
  }

  return { position, totalCompetitors, fleet };
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ARTICLE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function shouldRescrape(existing: ScrapedResult | undefined): boolean {
  if (!existing) return true;
  if (!existing.position) return true;
  if (!existing.scrapedAt) return true;
  const ageMs = Date.now() - new Date(existing.scrapedAt).getTime();
  return ageMs > RESCRAPE_AFTER_DAYS * 86_400_000;
}

async function enrichRace(
  race: ConsolidatedRace,
  denylist: string[],
): Promise<ScrapedResult> {
  const year = race.startDate.slice(0, 4);
  const queries = [
    `"James Juhasz" "${race.title}" results`,
    `"${race.title}" ${year} results ILCA`,
  ];

  const allLinks: string[] = [];
  for (const q of queries) {
    const links = await fetchFeedLinks(googleNewsRssUrl(q));
    for (const l of links) {
      if (denylist.some((needle) => needle && l.includes(needle))) continue;
      if (!allLinks.includes(l)) allLinks.push(l);
    }
  }
  const candidates = rankCandidates(allLinks).slice(0, MAX_CANDIDATES_PER_RACE);

  let externalUrl: string | null = null;
  let source: string | null = null;
  let parsed: ParsedResult = { position: null, totalCompetitors: null, fleet: null };

  for (const url of candidates) {
    const html = await fetchHtml(url);
    if (!html) continue;
    if (!html.toLowerCase().includes(NAME_NEEDLE)) {
      if (!externalUrl) {
        externalUrl = url;
        try {
          source = new URL(url).host;
        } catch {
          source = null;
        }
      }
      continue;
    }
    const tryParsed = parseResultsHtml(html);
    if (tryParsed.position) {
      externalUrl = url;
      try {
        source = new URL(url).host;
      } catch {
        source = null;
      }
      parsed = tryParsed;
      break;
    }
    if (!externalUrl) {
      externalUrl = url;
      try {
        source = new URL(url).host;
      } catch {
        source = null;
      }
    }
  }

  return {
    coachaibleId: race.coachaibleId,
    position: parsed.position,
    totalCompetitors: parsed.totalCompetitors,
    fleet: parsed.fleet,
    externalUrl,
    source,
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const file = await readAutoFile();
  const existingById = new Map(file.items.map((it) => [it.coachaibleId, it]));

  const stats = await fetchCoachaible();
  if (!stats) {
    console.error("[fetch-results] no CoachAible data — aborting.");
    process.exit(1);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const pastRaces = consolidateRaces(
    stats.events.filter(
      (e) => e.eventType === "race" && e.startDate < todayIso,
    ),
  );

  console.log(
    `[fetch-results] ${pastRaces.length} past races in ${STATS_WINDOW_DAYS}-day window.`,
  );

  const candidates = pastRaces.filter((r) => shouldRescrape(existingById.get(r.coachaibleId)));
  console.log(
    `[fetch-results] ${candidates.length} races to (re)scrape.`,
  );

  const toProcess = candidates.slice(0, Math.min(args.limit, MAX_NEW_PER_RUN));
  if (toProcess.length < candidates.length) {
    console.log(
      `[fetch-results] capped at ${toProcess.length} this run; remaining will catch up next run.`,
    );
  }

  const updated: ScrapedResult[] = [];
  for (const race of toProcess) {
    process.stdout.write(`  · ${race.startDate}  ${race.title} … `);
    const result = await enrichRace(race, file.denylist);
    if (result.position) {
      console.log(`#${result.position}${result.totalCompetitors ? `/${result.totalCompetitors}` : ""}`);
    } else if (result.externalUrl) {
      console.log(`url-only (${result.source})`);
    } else {
      console.log("no candidates");
    }
    updated.push(result);
  }

  const merged = new Map(existingById);
  for (const u of updated) merged.set(u.coachaibleId, u);
  const items = Array.from(merged.values()).sort((a, b) =>
    a.coachaibleId < b.coachaibleId ? 1 : -1,
  );

  if (args.dry) {
    console.log(`[fetch-results] --dry: would write ${items.length} items.`);
    return;
  }

  await writeAutoFile({ items, denylist: file.denylist });
  console.log(`[fetch-results] wrote ${items.length} items to ${path.relative(PROJECT_ROOT, DATA_FILE)}`);
}

main().catch((err) => {
  console.error("[fetch-results] failed:", err);
  process.exit(1);
});
