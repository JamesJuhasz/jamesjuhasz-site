/*
  scripts/backfill-covers.ts
  ---------------------------------------------------------------------------
  Some Squarespace posts had their hero photo set as the page cover but no
  inline <img> in body — so the import script's first-img-in-body strategy
  came up empty for them. This backfills coverImage by reading each
  post folder's index.html in the mirror, extracting og:image, downloading
  it, uploading to Sanity, and patching the post.

  Idempotent: only patches posts that don't already have coverImage.

  Run:
    npx tsx scripts/backfill-covers.ts
    npx tsx scripts/backfill-covers.ts --dry           # parse + report only
    npx tsx scripts/backfill-covers.ts --force         # overwrite existing covers
*/

import { createClient } from "@sanity/client";
import { JSDOM } from "jsdom";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const NEWSLETTERS_DIR = path.join(
  PROJECT_ROOT,
  "squarespace-backup",
  "mirror",
  "www.jamesjuhasz.com",
  "newsletters",
);

const args = {
  dry: process.argv.includes("--dry"),
  force: process.argv.includes("--force"),
};

if (
  !args.dry &&
  (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    !process.env.SANITY_API_WRITE_TOKEN)
) {
  console.error("Missing env. Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN.");
  process.exit(1);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2026-05-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

function extractOgImage(html: string): string | null {
  const dom = new JSDOM(html);
  const meta = dom.window.document.querySelector(
    'meta[property="og:image"]',
  );
  return meta?.getAttribute("content") ?? null;
}

async function uploadFromUrl(url: string): Promise<string | null> {
  // http -> https for Squarespace static
  const fixed = url.replace(/^http:\/\//, "https://");
  try {
    const res = await fetch(fixed);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(new URL(fixed).pathname) || "cover.jpg";
    const asset = await client.assets.upload("image", buf, { filename });
    return asset._id;
  } catch (err) {
    console.error(`  fetch/upload failed for ${fixed}:`, (err as Error).message);
    return null;
  }
}

async function getExistingCovers() {
  const result = (await client.fetch(
    `*[_type == "post"]{ _id, "slug": slug.current, "hasCover": defined(coverImage.asset) }`,
  )) as { _id: string; slug: string; hasCover: boolean }[];
  return new Map(result.map((r) => [r.slug, r]));
}

async function main() {
  const slugs = (await readdir(NEWSLETTERS_DIR)).filter((d) => d !== "index.html");
  const existing = args.dry ? null : await getExistingCovers();
  console.log(
    `Checking ${slugs.length} mirror folders. ${args.dry ? "Dry run." : "Patching missing."}`,
  );

  let patched = 0;
  let skipped = 0;
  let missing = 0;

  for (const slug of slugs) {
    const indexHtml = path.join(NEWSLETTERS_DIR, slug, "index.html");
    if (!existsSync(indexHtml)) {
      console.log(`  ? ${slug} — no index.html`);
      missing++;
      continue;
    }
    const html = await readFile(indexHtml, "utf8");
    const ogImage = extractOgImage(html);
    if (!ogImage) {
      console.log(`  ? ${slug} — no og:image`);
      missing++;
      continue;
    }

    if (args.dry) {
      console.log(`  [dry] ${slug} -> ${ogImage}`);
      patched++;
      continue;
    }

    const post = existing!.get(slug);
    if (!post) {
      console.log(`  ? ${slug} — no Sanity post (skipping)`);
      skipped++;
      continue;
    }
    if (post.hasCover && !args.force) {
      console.log(`  · ${slug} — already has cover (skipping)`);
      skipped++;
      continue;
    }

    const assetId = await uploadFromUrl(ogImage);
    if (!assetId) {
      console.log(`  ✗ ${slug} — upload failed`);
      missing++;
      continue;
    }

    await client
      .patch(post._id)
      .set({
        coverImage: {
          _type: "image",
          asset: { _type: "reference", _ref: assetId },
        },
      })
      .commit();
    console.log(`  ✓ ${slug}`);
    patched++;
  }

  console.log(`\nDone. ${patched} patched, ${skipped} skipped, ${missing} missing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
