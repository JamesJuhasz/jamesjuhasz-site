// Client-side upload helpers. Browsers can't render HEIC and sharp's
// prebuilt libheif on macOS/Vercel lacks an HEVC decoder, so we convert
// iPhone HEIC/HEIF to JPEG here before the file ever touches the server.

function looksLikeHeic(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export async function prepareForUpload(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file;
  const { heicTo } = await import("heic-to");
  const jpegBlob = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.85,
  });
  const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([jpegBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
