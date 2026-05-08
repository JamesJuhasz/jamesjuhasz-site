/*
  One-shot migration: move every image URL referenced by the DB to
  Cloudflare R2 and rewrite the DB row to point at the R2 public URL.

  Handles three URL families:
    - /uploads/<filename>          → admin-uploaded files in ./uploads/
    - /images/galleries/<slug>/<f> → seeded gallery photos in public/images/galleries/
    - https://cdn.sanity.io/...    → fetched over HTTPS, then re-uploaded

  Other absolute URLs and other /images/... paths are reported and skipped
  (static assets used by code, or URLs already on cdn.jamesjuhasz.com).

  Idempotent: re-runs use HeadObject to skip uploads that already exist,
  and only update DB rows that still reference non-R2 sources.

  Usage:
    npm run migrate:uploads-to-r2 -- --dry-run      # preview only
    npm run migrate:uploads-to-r2                   # actually run
*/

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import {
  getPublicBaseUrl,
  objectExists,
  putObject,
} from "../src/lib/admin/r2";

type UrlSource = {
  table: "posts" | "events" | "galleries" | "gallery_photos";
  column: string;
  id: number;
  url: string;
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot + 1).toLowerCase();
}

function localPathFor(url: string): string | null {
  if (url.startsWith("/uploads/")) {
    const name = url.slice("/uploads/".length);
    if (!name || name.includes("..") || name.includes("/")) return null;
    return path.join(process.cwd(), "uploads", name);
  }
  if (url.startsWith("/images/galleries/")) {
    const rel = url.slice("/images/".length);
    const segs = rel.split("/");
    if (segs.length !== 3 || segs.some((s) => !s || s === "..")) return null;
    return path.join(process.cwd(), "public", "images", ...segs);
  }
  return null;
}

async function fetchUrlSources(pool: Pool): Promise<UrlSource[]> {
  const queries: Array<{
    table: UrlSource["table"];
    column: string;
    sql: string;
  }> = [
    {
      table: "posts",
      column: "cover_image_url",
      sql: "SELECT id, cover_image_url AS url FROM posts WHERE cover_image_url IS NOT NULL",
    },
    {
      table: "events",
      column: "cover_image_url",
      sql: "SELECT id, cover_image_url AS url FROM events WHERE cover_image_url IS NOT NULL",
    },
    {
      table: "galleries",
      column: "cover_image_url",
      sql: "SELECT id, cover_image_url AS url FROM galleries WHERE cover_image_url IS NOT NULL",
    },
    {
      table: "gallery_photos",
      column: "url",
      sql: "SELECT id, url FROM gallery_photos WHERE url IS NOT NULL",
    },
  ];
  const out: UrlSource[] = [];
  for (const q of queries) {
    const res = await pool.query<{ id: number; url: string }>(q.sql);
    for (const r of res.rows) {
      out.push({ table: q.table, column: q.column, id: r.id, url: r.url });
    }
  }
  return out;
}

type Plan = {
  migrate: UrlSource[];     // local file or sanity URL — fetch + upload
  orphans: UrlSource[];     // /uploads/... but file missing locally
  alreadyOnR2: UrlSource[]; // already on cdn.jamesjuhasz.com
  unknownRemote: UrlSource[]; // some other https host — skip & report
  staticAssets: UrlSource[]; // /images/... not under galleries/
};

async function buildPlan(sources: UrlSource[]): Promise<Plan> {
  const plan: Plan = {
    migrate: [],
    orphans: [],
    alreadyOnR2: [],
    unknownRemote: [],
    staticAssets: [],
  };
  const r2Base = getPublicBaseUrl();
  for (const s of sources) {
    if (s.url.startsWith(`${r2Base}/`)) {
      plan.alreadyOnR2.push(s);
      continue;
    }
    if (s.url.startsWith("https://cdn.sanity.io/")) {
      plan.migrate.push(s);
      continue;
    }
    if (/^https?:\/\//i.test(s.url)) {
      plan.unknownRemote.push(s);
      continue;
    }
    const local = localPathFor(s.url);
    if (!local) {
      plan.staticAssets.push(s);
      continue;
    }
    try {
      await stat(local);
      plan.migrate.push(s);
    } catch {
      plan.orphans.push(s);
    }
  }
  return plan;
}

function listLocalUploads(): Set<string> {
  const dir = path.join(process.cwd(), "uploads");
  const out = new Set<string>();
  try {
    for (const name of readdirSync(dir)) out.add(`/uploads/${name}`);
  } catch {
    /* uploads dir doesn't exist locally — fine */
  }
  return out;
}

async function loadSourceBytes(
  src: UrlSource,
): Promise<{ data: Buffer; ext: string; mime: string }> {
  if (src.url.startsWith("https://cdn.sanity.io/")) {
    // Strip query params; Sanity sometimes appends transform hints.
    const cleanUrl = src.url.split("?")[0];
    const res = await fetch(cleanUrl);
    if (!res.ok) {
      throw new Error(`sanity fetch ${res.status}: ${cleanUrl}`);
    }
    const data = Buffer.from(await res.arrayBuffer());
    const ext = extOf(cleanUrl) || "jpg";
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    return { data, ext, mime };
  }
  const local = localPathFor(src.url);
  if (!local) throw new Error(`unexpected non-local url: ${src.url}`);
  const data = await readFile(local);
  const ext = extOf(local);
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  return { data, ext, mime };
}

async function migrateOne(
  pool: Pool,
  src: UrlSource,
  dryRun: boolean,
): Promise<{ newUrl: string; uploaded: boolean }> {
  const { data, ext, mime } = await loadSourceBytes(src);
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
  const key = `uploads/${hash}.${ext}`;
  const newUrl = `${getPublicBaseUrl()}/${key}`;
  if (dryRun) return { newUrl, uploaded: false };
  let uploaded = false;
  if (!(await objectExists(key))) {
    await putObject(key, data, mime);
    uploaded = true;
  }
  await pool.query(
    `UPDATE ${src.table} SET ${src.column} = $1 WHERE id = $2`,
    [newUrl, src.id],
  );
  return { newUrl, uploaded };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  // Fail fast if R2 env is missing.
  getPublicBaseUrl();

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  console.log(`[migrate] mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`[migrate] target: ${getPublicBaseUrl()}`);

  const sources = await fetchUrlSources(pool);
  console.log(`[migrate] DB rows scanned: ${sources.length}`);

  const plan = await buildPlan(sources);
  console.log(
    `[migrate] migrate=${plan.migrate.length} orphans=${plan.orphans.length} ` +
      `alreadyOnR2=${plan.alreadyOnR2.length} ` +
      `unknownRemote=${plan.unknownRemote.length} ` +
      `staticAssets=${plan.staticAssets.length}`,
  );

  const localUploads = listLocalUploads();
  const referenced = new Set(
    sources.filter((s) => s.url.startsWith("/uploads/")).map((s) => s.url),
  );
  const unreferenced = [...localUploads].filter((u) => !referenced.has(u));

  if (plan.orphans.length > 0) {
    console.log(`\n[migrate] ORPHAN ROWS (local file missing — re-upload via admin to fix):`);
    for (const o of plan.orphans) {
      console.log(`  ${o.table}.${o.column} id=${o.id}  ${o.url}`);
    }
  }
  if (unreferenced.length > 0) {
    console.log(`\n[migrate] UNREFERENCED LOCAL FILES (no DB row — left untouched):`);
    for (const u of unreferenced) console.log(`  ${u}`);
  }
  if (plan.alreadyOnR2.length > 0) {
    console.log(`\n[migrate] ALREADY ON R2 (skipped — previous run migrated these):`);
    const sample = plan.alreadyOnR2.slice(0, 5);
    for (const r of sample) {
      console.log(`  ${r.table}.${r.column} id=${r.id}  ${r.url}`);
    }
    if (plan.alreadyOnR2.length > sample.length) {
      console.log(`  … and ${plan.alreadyOnR2.length - sample.length} more.`);
    }
  }
  if (plan.unknownRemote.length > 0) {
    console.log(
      `\n[migrate] UNKNOWN REMOTE URLS (skipped — not /uploads, not Sanity, not R2):`,
    );
    for (const r of plan.unknownRemote) {
      console.log(`  ${r.table}.${r.column} id=${r.id}  ${r.url}`);
    }
  }
  if (plan.staticAssets.length > 0) {
    console.log(
      `\n[migrate] STATIC ASSET PATHS (/images/... not under galleries — skipped, used by code):`,
    );
    const sample = plan.staticAssets.slice(0, 5);
    for (const r of sample) {
      console.log(`  ${r.table}.${r.column} id=${r.id}  ${r.url}`);
    }
    if (plan.staticAssets.length > sample.length) {
      console.log(`  … and ${plan.staticAssets.length - sample.length} more.`);
    }
  }

  if (plan.migrate.length === 0) {
    console.log(`\n[migrate] nothing to migrate.`);
  } else {
    console.log(
      `\n[migrate] ${dryRun ? "would migrate" : "migrating"} ${plan.migrate.length} files…`,
    );
    let done = 0;
    let uploaded = 0;
    let dedupedOnR2 = 0;
    let failed = 0;
    for (const src of plan.migrate) {
      try {
        const result = await migrateOne(pool, src, dryRun);
        done++;
        if (result.uploaded) uploaded++;
        else if (!dryRun) dedupedOnR2++;
        if (done % 25 === 0 || done === plan.migrate.length) {
          console.log(
            `  [${done}/${plan.migrate.length}] ${src.table}#${src.id}  →  ${result.newUrl}`,
          );
        }
      } catch (err) {
        failed++;
        console.error(
          `  FAIL ${src.table}#${src.id} ${src.url}: ${(err as Error).message}`,
        );
      }
    }
    console.log(
      `\n[migrate] complete. uploaded=${uploaded} dedupedOnR2=${dedupedOnR2} failed=${failed}`,
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
