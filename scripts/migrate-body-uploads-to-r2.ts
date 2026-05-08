/*
  Follow-up to migrate-uploads-to-r2.ts: rewrite inline `/uploads/<hash>.<ext>`
  references that live inside posts.body_html / body_json (and the equivalent
  event columns) — paths the original migration didn't scan because it only
  touched cover_image_url and gallery_photos.url columns.

  For each unique relative URL found:
    1. HEAD on R2 — if the object is already there, just schedule a string
       rewrite from `/uploads/...` to `https://cdn.jamesjuhasz.com/uploads/...`.
    2. Else, look for the bytes in `./uploads/` and upload them under the
       same key, then schedule the rewrite.
    3. Else, report as orphan and skip — those rows need manual re-upload via
       admin.

  Idempotent: rows already pointing at the cdn host are untouched.

  Usage:
    npm run migrate:body-uploads-to-r2 -- --dry-run    # preview only
    npm run migrate:body-uploads-to-r2                 # actually run
*/

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import {
  getPublicBaseUrl,
  objectExists,
  putObject,
} from "../src/lib/admin/r2";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

type RichTextSource = {
  table: "posts" | "events";
  id: number;
  htmlPaths: string[];
  jsonPaths: string[];
};

type ResolvedUrl = {
  // The relative URL as stored, e.g. /uploads/3cff….jpg
  relative: string;
  // Resolution: rewrite (already on R2 or just uploaded), or orphan (not found anywhere).
  status: "on-r2" | "uploaded" | "orphan";
};

const RELATIVE_RE = /\/uploads\/[a-f0-9]+\.[a-z]+/gi;

function localPathFor(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const name = url.slice("/uploads/".length);
  if (!name || name.includes("..") || name.includes("/")) return null;
  return path.join(process.cwd(), "uploads", name);
}

function keyFor(url: string): string {
  // url is /uploads/<hash>.<ext>
  return url.slice(1); // → uploads/<hash>.<ext>
}

function extOf(url: string): string {
  const dot = url.lastIndexOf(".");
  return dot < 0 ? "" : url.slice(dot + 1).toLowerCase();
}

function uniqueRelativeUrls(text: string): string[] {
  const matches = text.match(RELATIVE_RE) ?? [];
  return Array.from(new Set(matches));
}

async function fetchSources(pool: Pool): Promise<RichTextSource[]> {
  const out: RichTextSource[] = [];
  for (const table of ["posts", "events"] as const) {
    const res = await pool.query<{
      id: number;
      body_html: string | null;
      body_json: unknown;
    }>(
      `SELECT id, body_html, body_json
       FROM ${table}
       WHERE body_html ~ '/uploads/[a-f0-9]+\\.[a-z]+'
          OR body_json::text ~ '/uploads/[a-f0-9]+\\.[a-z]+'`,
    );
    for (const r of res.rows) {
      const htmlPaths = r.body_html ? uniqueRelativeUrls(r.body_html) : [];
      const jsonPaths = r.body_json
        ? uniqueRelativeUrls(JSON.stringify(r.body_json))
        : [];
      if (htmlPaths.length === 0 && jsonPaths.length === 0) continue;
      out.push({ table, id: r.id, htmlPaths, jsonPaths });
    }
  }
  return out;
}

async function resolveUrl(
  rel: string,
  dryRun: boolean,
): Promise<ResolvedUrl> {
  const key = keyFor(rel);
  if (await objectExists(key)) return { relative: rel, status: "on-r2" };

  // Try local file fallback.
  const local = localPathFor(rel);
  if (local) {
    try {
      await stat(local);
      if (!dryRun) {
        const data = await readFile(local);
        const ext = extOf(rel);
        const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
        await putObject(key, data, mime);
      }
      return { relative: rel, status: "uploaded" };
    } catch {
      // Falls through to orphan.
    }
  }
  return { relative: rel, status: "orphan" };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const cdn = getPublicBaseUrl();

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  console.log(`[body-migrate] mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`[body-migrate] target: ${cdn}`);

  const sources = await fetchSources(pool);
  if (sources.length === 0) {
    console.log("[body-migrate] no rows reference /uploads/ in body fields. nothing to do.");
    await pool.end();
    return;
  }

  // Collect unique URLs across all rows.
  const allUrls = new Set<string>();
  for (const s of sources) {
    for (const u of s.htmlPaths) allUrls.add(u);
    for (const u of s.jsonPaths) allUrls.add(u);
  }
  console.log(
    `[body-migrate] rows affected: ${sources.length} | unique URLs: ${allUrls.size}`,
  );

  // Resolve each unique URL.
  const resolved = new Map<string, ResolvedUrl>();
  for (const u of allUrls) {
    const r = await resolveUrl(u, dryRun);
    resolved.set(u, r);
    console.log(`  ${r.status.padEnd(8)}  ${u}`);
  }

  const orphans = [...resolved.values()].filter((r) => r.status === "orphan");
  if (orphans.length > 0) {
    console.log(
      `\n[body-migrate] ORPHAN URLS (${orphans.length}) — bytes not on R2 and missing locally; affected post bodies will keep these inline references until admin re-uploads:`,
    );
    for (const o of orphans) console.log(`  ${o.relative}`);
  }

  if (dryRun) {
    console.log(`\n[body-migrate] dry run — no DB changes.`);
    await pool.end();
    return;
  }

  // For each affected row, replace every non-orphan relative URL with the cdn URL.
  let updated = 0;
  for (const s of sources) {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (s.htmlPaths.length > 0) {
      // Build a chained REPLACE expression. Skip orphans.
      const eligible = s.htmlPaths.filter(
        (u) => resolved.get(u)?.status !== "orphan",
      );
      if (eligible.length > 0) {
        let expr = "body_html";
        for (const u of eligible) {
          params.push(u, `${cdn}${u}`);
          expr = `REPLACE(${expr}, $${params.length - 1}, $${params.length})`;
        }
        setClauses.push(`body_html = ${expr}`);
      }
    }
    if (s.jsonPaths.length > 0) {
      const eligible = s.jsonPaths.filter(
        (u) => resolved.get(u)?.status !== "orphan",
      );
      if (eligible.length > 0) {
        let expr = "body_json::text";
        for (const u of eligible) {
          params.push(u, `${cdn}${u}`);
          expr = `REPLACE(${expr}, $${params.length - 1}, $${params.length})`;
        }
        setClauses.push(`body_json = (${expr})::jsonb`);
      }
    }

    if (setClauses.length === 0) continue;
    params.push(s.id);
    const sql = `UPDATE ${s.table} SET ${setClauses.join(", ")} WHERE id = $${params.length}`;
    await pool.query(sql, params);
    updated++;
    console.log(`  UPDATED ${s.table}#${s.id}`);
  }

  console.log(`\n[body-migrate] complete. rows updated: ${updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
