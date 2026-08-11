import { createHash } from "node:crypto";
import sharp from "sharp";
import { getPublicBaseUrl, objectExists, putObject } from "./r2";

export const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const MAX_BYTES = 30 * 1024 * 1024; // 30 MB — fits modern iPhone HEIC/JPEG/Live Photos

// Longest-edge cap for stored images. Body images render at w=1200 and covers
// top out around a ~1920px device width, so 2048 leaves retina headroom while
// keeping the file small enough that Next's on-demand image optimizer can
// resize it on first hit without stalling — the source of the "images don't
// load right after posting" problem, where a burst of readers arriving from
// the newsletter email all hit the cold optimizer against multi-MB originals.
export const MAX_EDGE = 2048;

/**
 * Normalize an uploaded raster image for storage: bake in EXIF orientation,
 * downscale to MAX_EDGE, and re-encode. HEIC/HEIF (which browsers can't render)
 * become JPEG. Animated GIF and AVIF are passed through untouched — resizing a
 * GIF would drop its animation, and re-encoding AVIF is needlessly expensive.
 */
export async function normalizeImage(
  data: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string }> {
  if (mime === "image/gif" || mime === "image/avif") {
    return { data, mime };
  }
  // failOn:"none" keeps slightly-malformed phone exports from hard-failing.
  const pipeline = sharp(data, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });

  if (mime === "image/png") {
    return { data: await pipeline.png({ compressionLevel: 9 }).toBuffer(), mime: "image/png" };
  }
  if (mime === "image/webp") {
    return { data: await pipeline.webp({ quality: 82 }).toBuffer(), mime: "image/webp" };
  }
  // jpeg, heic, heif → jpeg
  return { data: await pipeline.jpeg({ quality: 82 }).toBuffer(), mime: "image/jpeg" };
}

export async function saveUpload(
  data: Buffer,
  mime: string,
): Promise<{ filename: string; url: string; size: number }> {
  if (!ACCEPTED_MIME.has(mime)) {
    throw new Error(`unsupported mime: ${mime}`);
  }
  if (data.length === 0) throw new Error("empty file");
  if (data.length > MAX_BYTES) throw new Error("file too large");

  const { data: outData, mime: outMime } = await normalizeImage(data, mime);

  // Content-hash the final bytes so identical uploads dedupe.
  const hash = createHash("sha256").update(outData).digest("hex").slice(0, 16);
  const ext = EXT_BY_MIME[outMime];
  const filename = `${hash}.${ext}`;
  const key = `uploads/${filename}`;

  if (!(await objectExists(key))) {
    await putObject(key, outData, outMime);
  }

  return {
    filename,
    url: `${getPublicBaseUrl()}/${key}`,
    size: outData.length,
  };
}
