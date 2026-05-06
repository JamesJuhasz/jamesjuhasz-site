/*
  scripts/import-from-export.ts
  ---------------------------------------------------------------------------
  Idempotent one-shot import from the Squarespace XML export at
  ./squarespace-backup/squarespace-export.xml into Sanity.

  Run:
    npx tsx scripts/import-from-export.ts                # full run
    npx tsx scripts/import-from-export.ts --dry          # parse only, no writes
    npx tsx scripts/import-from-export.ts --limit=3      # try first 3 first
    npx tsx scripts/import-from-export.ts --only=post    # post|event

  Env required:
    NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
    SANITY_API_WRITE_TOKEN

  Re-running with the same data UPDATES existing documents thanks to
  deterministic ids: post-<slug>, event-<slug>.
*/

import { createClient } from "@sanity/client";
import { htmlToBlocks } from "@sanity/block-tools";
import { Schema } from "@sanity/schema";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { schemaTypes } from "../src/sanity/schemas";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const EXPORT_PATH = path.join(
  PROJECT_ROOT,
  "squarespace-backup",
  "squarespace-export.xml",
);
const IMAGES_DIR = path.join(
  PROJECT_ROOT,
  "squarespace-backup",
  "all-images",
);

type Args = { dry: boolean; limit?: number; only?: "post" | "event" };

function parseArgs(): Args {
  const args: Args = { dry: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry") args.dry = true;
    else if (a.startsWith("--limit=")) args.limit = Number(a.slice(8));
    else if (a.startsWith("--only=")) {
      const v = a.slice(7) as "post" | "event";
      if (v === "post" || v === "event") args.only = v;
    }
  }
  return args;
}

const args = parseArgs();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2026-05-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

if (!args.dry && (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN)) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.local.",
  );
  process.exit(1);
}

const blockSchema = Schema.compile({ name: "default", types: schemaTypes });
const postBodyType = blockSchema
  .get("post")
  .fields.find((f: { name: string }) => f.name === "body").type;

type ImportItem = {
  type: "post" | "event";
  slug: string;
  title: string;
  publishedAt: string;
  contentHtml: string;
  link: string;
};

const SKIP_PAGE_LINKS = new Set([
  "/home",
  "/about",
  "/contact",
  "/donate",
  "/press",
  "/subscribe",
  "/name-my-boat",
  "/clinic-registration",
  "/thank-you",
]);

function detectCategory(item: ImportItem): "Regatta" | "Training" | "Coaching" {
  const haystack = `${item.title} ${item.contentHtml}`.toLowerCase();
  if (/clinic|coach/.test(haystack)) return "Coaching";
  if (/training|practice|camp/.test(haystack)) return "Training";
  return "Regatta";
}

function slugFromLink(link: string): string {
  const parts = link.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "untitled";
}

function parseXml(xml: string): ImportItem[] {
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const items = Array.from(doc.querySelectorAll("item")) as Element[];
  const out: ImportItem[] = [];
  for (const item of items) {
    const title = item.querySelector("title")?.textContent?.trim() ?? "";
    const link = item.querySelector("link")?.textContent?.trim() ?? "";
    const postType = item.querySelector("wp\\:post_type, post_type")?.textContent?.trim() ?? "";
    const status = item.querySelector("wp\\:status, status")?.textContent?.trim() ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";
    const contentHtml =
      item.querySelector("content\\:encoded, encoded")?.textContent ?? "";

    if (status !== "publish") continue;
    if (postType === "post") {
      out.push({
        type: "post",
        slug: slugFromLink(link),
        title,
        publishedAt: new Date(pubDate || Date.now()).toISOString(),
        contentHtml,
        link,
      });
    } else if (postType === "page" && link.startsWith("/events/")) {
      out.push({
        type: "event",
        slug: slugFromLink(link),
        title,
        publishedAt: new Date(pubDate || Date.now()).toISOString(),
        contentHtml,
        link,
      });
    } else if (
      postType === "page" &&
      !link.startsWith("/gallery/") &&
      !SKIP_PAGE_LINKS.has(link)
    ) {
      // Other pages are intentionally skipped — they map to static routes.
    }
  }
  return out;
}

async function uploadImageBySrc(
  src: string,
): Promise<{ _type: "reference"; _ref: string } | null> {
  // Squarespace export embeds remote URLs. We try to resolve a local file
  // in ./squarespace-backup/all-images/ by basename first to save bandwidth.
  const url = new URL(src, "https://www.jamesjuhasz.com");
  const basename = path.basename(url.pathname);
  const localPath = path.join(IMAGES_DIR, basename);

  let buffer: Buffer;
  let filename: string;
  if (existsSync(localPath)) {
    buffer = await readFile(localPath);
    filename = basename;
  } else {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      buffer = Buffer.from(await res.arrayBuffer());
      filename = basename;
    } catch {
      return null;
    }
  }

  const asset = await client.assets.upload("image", buffer, { filename });
  return { _type: "reference", _ref: asset._id };
}

async function htmlToPortableText(
  html: string,
): Promise<{ blocks: unknown[]; firstImageRef?: string }> {
  const cleaned = html
    .replace(/\[caption[^\]]*\]/g, "<figure>")
    .replace(/\[\/caption\]/g, "</figure>");

  const dom = new JSDOM(`<body>${cleaned}</body>`);
  const imgEls = Array.from(
    dom.window.document.body.querySelectorAll("img"),
  ) as HTMLImageElement[];
  const srcToRef = new Map<string, string>();
  for (const img of imgEls) {
    const src = img.getAttribute("src");
    if (!src || srcToRef.has(src)) continue;
    const ref = await uploadImageBySrc(src);
    if (ref) srcToRef.set(src, ref._ref);
  }

  let firstImageRef: string | undefined;
  const parts = cleaned.split(/(<img[^>]*\/?>)/i);
  const blocks: unknown[] = [];
  for (const part of parts) {
    if (/^<img/i.test(part)) {
      const srcMatch = part.match(/src=["']([^"']+)["']/);
      const altMatch = part.match(/alt=["']([^"']*)["']/);
      if (!srcMatch) continue;
      const ref = srcToRef.get(srcMatch[1]);
      if (!ref) continue;
      if (!firstImageRef) firstImageRef = ref;
      blocks.push({
        _type: "image",
        _key: cryptoKey(),
        asset: { _type: "reference", _ref: ref },
        alt: altMatch?.[1] ?? "",
      });
      continue;
    }
    const trimmed = part.trim();
    if (!trimmed) continue;
    const sub = htmlToBlocks(trimmed, postBodyType, {
      parseHtml: (h) => new JSDOM(h).window.document,
    });
    for (const b of sub) {
      const block = b as unknown as Record<string, unknown>;
      if (!block._key) block._key = cryptoKey();
      blocks.push(block);
    }
  }
  return { blocks, firstImageRef };
}

function cryptoKey(): string {
  return Math.random().toString(36).slice(2, 14);
}

async function importItem(item: ImportItem) {
  const { blocks: body, firstImageRef } = await htmlToPortableText(
    item.contentHtml,
  );
  const coverImage = firstImageRef
    ? {
        _type: "image",
        asset: { _type: "reference", _ref: firstImageRef },
      }
    : undefined;

  if (item.type === "post") {
    const id = `post-${item.slug}`;
    const doc = {
      _id: id,
      _type: "post",
      title: item.title,
      slug: { current: item.slug, _type: "slug" },
      publishedAt: item.publishedAt,
      excerpt: deriveExcerpt(item.contentHtml),
      coverImage,
      body,
      tags: [],
      featured: false,
    };
    if (args.dry) {
      console.log(
        `  [dry] post-${item.slug} (${body.length} blocks, cover: ${firstImageRef ? "yes" : "no"})`,
      );
      return;
    }
    await client.createOrReplace(doc);
    console.log(
      `  ✓ post-${item.slug}${firstImageRef ? " (with cover)" : ""}`,
    );
    return;
  }

  if (item.type === "event") {
    const id = `event-${item.slug}`;
    const doc = {
      _id: id,
      _type: "event",
      title: item.title,
      slug: { current: item.slug, _type: "slug" },
      eventDate: item.publishedAt.slice(0, 10),
      location: deriveLocation(item.contentHtml) ?? "—",
      category: detectCategory(item),
      coverImage,
      body,
    };
    if (args.dry) {
      console.log(`  [dry] event-${item.slug} (${body.length} blocks)`);
      return;
    }
    await client.createOrReplace(doc);
    console.log(`  ✓ event-${item.slug}`);
  }
}

function deriveExcerpt(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 195) + (text.length > 195 ? "…" : "");
}

function deriveLocation(html: string): string | null {
  // Opportunistic — look for "in <Location>" or "from <Location>"
  const m = html.match(/(?:in|from)\s+([A-Z][A-Za-z][^,.<\n]{2,40})/);
  return m?.[1] ?? null;
}

async function main() {
  if (!existsSync(EXPORT_PATH)) {
    console.error(`Export file not found: ${EXPORT_PATH}`);
    process.exit(1);
  }
  console.log(`Reading ${EXPORT_PATH}...`);
  const xml = await readFile(EXPORT_PATH, "utf8");

  const all = parseXml(xml);
  let items = args.only ? all.filter((i) => i.type === args.only) : all;
  if (args.limit) items = items.slice(0, args.limit);

  console.log(
    `Parsed ${all.length} items (${all.filter((i) => i.type === "post").length} posts, ${all.filter((i) => i.type === "event").length} events). Importing ${items.length}.`,
  );

  let ok = 0;
  let fail = 0;
  for (const item of items) {
    try {
      await importItem(item);
      ok++;
    } catch (err) {
      fail++;
      console.error(`  ✗ ${item.type}-${item.slug}:`, (err as Error).message);
    }
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
