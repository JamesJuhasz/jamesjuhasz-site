/*
  scripts/fetch-world-sailing.ts
  ---------------------------------------------------------------------------
  Pulls the World Sailing athlete profile (the canonical, federation-authoritative
  record of regatta entries + finishes) and writes a typed fixture for the site.

  Source: https://www.sailing.org/sailor/james-juhasz?ref=CANJJ18
  Strategy: the page is a Nuxt 2 SSR app that embeds all data in a packed
  `window.__NUXT__=(function(...){...}(...))` IIFE. We extract that expression
  and evaluate it in a controlled scope. No browser, no JS runtime quirks —
  the IIFE only references its own arguments and primitives.

  Run:
    npm run ws:fetch
    npx tsx scripts/fetch-world-sailing.ts --dry
*/

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const DATA_FILE = path.join(
  PROJECT_ROOT,
  "src",
  "data",
  "world-sailing-events.json",
);

const PROFILE_URL =
  "https://www.sailing.org/sailor/james-juhasz?ref=CANJJ18";

const args = {
  dry: process.argv.includes("--dry"),
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export type WSEventRow = {
  /** Stable World Sailing event UUID — primary key for joins. */
  worldSailingEventId: string;
  /** WS regatta UUID (one regatta can have many class events). */
  worldSailingRegattaId: string;
  /** Regatta-level WS code, e.g. "ESP202503O7Y". May be null on older entries. */
  worldSailingRegattaCode: string | null;
  regattaName: string;
  /** ISO date YYYY-MM-DD. */
  startDate: string;
  /** ISO date YYYY-MM-DD. */
  endDate: string;
  /** Final finish position in the class event. */
  position: number | null;
  /** ILCA 7, etc. */
  className: string;
  /** ILCA7, etc. */
  classCode: string;
  discipline: string | null;
  /** WS regatta grade (100, 200, etc.) — useful for sorting by importance. */
  grade: string | null;
  /** Event _name field, e.g. "ILCA 7 Men". */
  eventName: string | null;
  regattaWebsite: string | null;
  description: string | null;
  /** Sailor's sail number for that event. */
  sailNumber: string | null;
};

export type WSDump = {
  fetchedAt: string;
  source: string;
  sailorName: string;
  worldSailingId: string | null;
  events: WSEventRow[];
};

function pickIIFE(html: string): string | null {
  // Match the IIFE that follows `window.__NUXT__=` and is terminated by `;`.
  // The body is roughly: (function(...){return {...}}(...))
  const m = html.match(/window\.__NUXT__=(\(function[\s\S]*?\}\(.*?\)\))\s*;/);
  return m ? m[1] : null;
}

type RawCrew = {
  /** WS serializes this as a string ("3", "12", "107") even though it's numeric. */
  position?: number | string | null;
  sailNumber?: string | null;
  event?: {
    id?: string;
    _name?: string | null;
    boatClass?: { name?: string; classCode?: string };
    discipline?: { name?: string };
    grade?: { name?: string };
    regatta?: {
      id?: string;
      name?: string;
      startDate?: string;
      endDate?: string;
      website?: string | null;
      worldSailingId?: string | null;
      description?: string | null;
    };
  };
};

function parsePosition(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toIsoDate(v: string | undefined | null): string | null {
  if (!v) return null;
  // WS gives "2026-04-18 00:00:00" — slice the date part.
  return v.slice(0, 10);
}

function normalize(crew: RawCrew): WSEventRow | null {
  const e = crew.event;
  if (!e || !e.regatta || !e.id || !e.regatta.id) return null;
  const start = toIsoDate(e.regatta.startDate);
  const end = toIsoDate(e.regatta.endDate);
  if (!start || !end) return null;

  return {
    worldSailingEventId: e.id,
    worldSailingRegattaId: e.regatta.id,
    worldSailingRegattaCode: e.regatta.worldSailingId ?? null,
    regattaName: (e.regatta.name ?? "").trim(),
    startDate: start,
    endDate: end,
    position: parsePosition(crew.position),
    className: e.boatClass?.name ?? "",
    classCode: e.boatClass?.classCode ?? "",
    discipline: e.discipline?.name ?? null,
    grade: e.grade?.name ?? null,
    eventName: e._name ?? null,
    regattaWebsite: e.regatta.website ?? null,
    description: e.regatta.description ?? null,
    sailNumber: crew.sailNumber ?? null,
  };
}

async function main() {
  console.log(`[ws] fetching ${PROFILE_URL}`);
  const res = await fetch(PROFILE_URL, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const iife = pickIIFE(html);
  if (!iife) {
    throw new Error("could not locate window.__NUXT__ IIFE in profile HTML");
  }

  // Evaluate the IIFE. Safe-ish: it's a pure function body returning a literal
  // composed of its closure args (strings/numbers/objects). No globals touched.
  const fn = new Function(`return ${iife};`);
  const data = fn() as { data?: Array<{ sailor?: unknown }> };
  const sailor = data?.data?.[0]?.sailor as
    | {
        firstName?: string;
        lastName?: string;
        worldSailingId?: string | null;
        crews?: RawCrew[];
      }
    | undefined;

  if (!sailor) throw new Error("no sailor object in __NUXT__ payload");

  const crews = sailor.crews ?? [];
  const events: WSEventRow[] = [];
  let dropped = 0;
  for (const c of crews) {
    const row = normalize(c);
    if (row) events.push(row);
    else dropped++;
  }

  events.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const dump: WSDump = {
    fetchedAt: new Date().toISOString(),
    source: PROFILE_URL,
    sailorName: `${sailor.firstName ?? ""} ${sailor.lastName ?? ""}`.trim(),
    worldSailingId: sailor.worldSailingId ?? null,
    events,
  };

  console.log(
    `[ws] parsed ${events.length} events (${dropped} dropped without regatta)`,
  );
  if (events.length === 0) {
    throw new Error("zero events parsed — refusing to overwrite fixture");
  }

  if (args.dry) {
    console.log("[ws] --dry: not writing; preview of first 3 rows:");
    console.log(JSON.stringify(events.slice(0, 3), null, 2));
    return;
  }

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(dump, null, 2) + "\n", "utf8");
  console.log(`[ws] wrote ${path.relative(PROJECT_ROOT, DATA_FILE)}`);
}

main().catch((err) => {
  console.error("[ws] failed:", err);
  process.exit(1);
});
