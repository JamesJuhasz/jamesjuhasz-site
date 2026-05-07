import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

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
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export const MAX_BYTES = 30 * 1024 * 1024; // 30 MB — fits modern iPhone HEIC/JPEG/Live Photos

export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

export async function ensureUploadsDir(): Promise<string> {
  const dir = getUploadsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

function makeName(mime: string): string {
  const ext = EXT_BY_MIME[mime];
  const id = randomBytes(8).toString("hex");
  const ts = Date.now().toString(36);
  return `${ts}-${id}.${ext}`;
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

  // iPhones upload HEIC/HEIF; browsers can't render those, so transcode to JPEG.
  let outData = data;
  let outMime = mime;
  if (mime === "image/heic" || mime === "image/heif") {
    outData = await sharp(data).rotate().jpeg({ quality: 85 }).toBuffer();
    outMime = "image/jpeg";
  }

  const dir = await ensureUploadsDir();
  // Dedupe: hash final content; if a file with the same hash exists, return its URL.
  const hash = createHash("sha256").update(outData).digest("hex").slice(0, 16);
  const ext = EXT_BY_MIME[outMime];
  const filename = `${hash}.${ext}`;
  const fullPath = path.join(dir, filename);
  let exists = false;
  try {
    await stat(fullPath);
    exists = true;
  } catch {
    /* not present */
  }
  if (!exists) {
    await writeFile(fullPath, outData);
  }
  return { filename, url: `/uploads/${filename}`, size: outData.length };
}

export async function readUpload(name: string): Promise<{
  data: Buffer;
  mime: string;
} | null> {
  // Reject path traversal & subpaths.
  if (name.includes("/") || name.includes("..") || name.includes("\\")) {
    return null;
  }
  const dot = name.lastIndexOf(".");
  if (dot < 1) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;
  try {
    const data = await readFile(path.join(getUploadsDir(), name));
    return { data, mime };
  } catch {
    return null;
  }
}

// Reserved for future cleanup: makeName helper kept for tests.
export const _internal = { makeName };
