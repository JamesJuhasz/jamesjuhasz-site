// Client-side upload helpers. sharp's prebuilt libheif on the server has no
// HEVC decoder, so iPhone HEIC/HEIF must be converted to JPEG in the browser
// before the file ever touches the server.
//
// Two decode paths, tried in order:
//   1. Native browser decode (Safari uses Apple's OS decoder via <img> + canvas).
//      This reads real iPhone HEICs — including the large "grid" images and
//      slightly-short files — that the WASM path below rejects with a "bad seek"
//      or a smeared partial decode.
//   2. heic-to (WASM libheif) as a fallback for browsers that can't decode HEIC
//      natively (Chrome/Firefox).

function looksLikeHeic(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

// Cap the decoded canvas to this longest edge. It keeps us inside Safari's
// canvas-area limits (iOS tops out near 16.7 MP, and iPhone HEICs exceed that),
// shrinks the upload, and matches the server's own MAX_EDGE so nothing is lost —
// the server would downscale to this size anyway.
const MAX_EDGE = 2048;

function jpegFileFromBlob(blob: Blob, source: File): File {
  const baseName = source.name.replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: source.lastModified,
  });
}

/**
 * Decode a HEIC via the browser's own image pipeline and re-encode as JPEG.
 * Works where the browser can natively decode HEIC (Safari on macOS/iOS, which
 * uses Apple's decoder). Returns null if the browser can't decode it, so the
 * caller can fall back to the WASM path.
 */
async function decodeHeicNatively(file: File): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.decoding = "async";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded || !img.naturalWidth || !img.naturalHeight) return null;

    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob || blob.size === 0) return null;
    return jpegFileFromBlob(blob, file);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareForUpload(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file;

  // 1) Native decode (Safari): Apple's decoder handles iPhone HEICs the WASM
  //    path can't. Preferred whenever the browser supports it.
  const native = await decodeHeicNatively(file);
  if (native) return native;

  // 2) Fallback: WASM libheif for browsers without native HEIC support.
  const { heicTo } = await import("heic-to");
  const jpegBlob = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.85,
  });
  return jpegFileFromBlob(jpegBlob, file);
}
