#!/usr/bin/env node
/**
 * Generates 10×10 JPEG blur placeholders (as base64 data URIs) for every
 * gallery photo and writes them to src/data/gallery-blur.json.
 *
 * Run once after adding / changing gallery images:
 *   node scripts/generate-blur-placeholders.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const GALLERIES_DIR = path.join(REPO, "public", "images", "galleries");
const OUT_FILE = path.join(REPO, "src", "data", "gallery-blur.json");

async function blurDataURL(filePath) {
  const buf = await sharp(filePath)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 20 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function main() {
  const result = {};
  const galleries = fs.readdirSync(GALLERIES_DIR).filter((d) =>
    fs.statSync(path.join(GALLERIES_DIR, d)).isDirectory()
  );

  let total = 0;
  for (const gallery of galleries) {
    const dir = path.join(GALLERIES_DIR, gallery);
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .sort();

    process.stdout.write(`  ${gallery}: ${files.length} images… `);
    for (const file of files) {
      const publicPath = `/images/galleries/${gallery}/${file}`;
      result[publicPath] = await blurDataURL(path.join(dir, file));
      total++;
    }
    console.log("done");
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 0));
  console.log(`\nWrote ${total} entries → ${path.relative(REPO, OUT_FILE)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
