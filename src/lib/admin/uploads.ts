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

export async function saveUpload(
  data: Buffer,
  mime: string,
): Promise<{ filename: string; url: string; size: number }> {
  if (!ACCEPTED_MIME.has(mime)) {
    throw new Error(`unsupported mime: ${mime}`);
  }
  if (data.length === 0) throw new Error("empty file");
  if (data.length > MAX_BYTES) throw new Error("file too large");

  // iPhones upload HEIC/HEIF; browsers can't render those, so transcode to JPEG.
  let outData = data;
  let outMime = mime;
  if (mime === "image/heic" || mime === "image/heif") {
    outData = await sharp(data).rotate().jpeg({ quality: 85 }).toBuffer();
    outMime = "image/jpeg";
  }

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
