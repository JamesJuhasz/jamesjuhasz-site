/*
  Pre-warm Next's on-demand image optimizer for a post's images.

  The optimizer resizes/re-encodes each source image the first time its
  `/_next/image?url=…` URL is requested, then caches the result. Before that
  first hit the request is slow — and when a newsletter email goes out, a burst
  of readers arrive at once against a cold cache, so images stall and paint only
  partially. Warming the exact optimizer URLs ourselves — right before the email
  broadcast, and on publish — means the derivatives are already cached when real
  readers arrive.

  We hit the SAME optimizer URLs the pages will request:
    - body images: proxyImagesInHtml rewrites each to a fixed w=1200&q=75.
    - cover image: next/image emits a srcset across device widths; we warm the
      common ones.
*/

import { proxyImageUrl } from "@/lib/img-proxy";

// Same regex shape as img-proxy's, but capturing only the URL.
const IMG_SRC_RE = /<img\b[^>]*?\ssrc="(https?:\/\/[^"]+)"/gi;

// Device widths next/image is most likely to request for the cover (a
// half-width hero on desktop, full-width on mobile). A superset is harmless —
// warming a width nobody requests just fills the cache early.
const COVER_WIDTHS = [640, 828, 1080, 1200, 1920];

function collectBodyImageUrls(html: string | null | undefined): string[] {
  if (!html) return [];
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  IMG_SRC_RE.lastIndex = 0;
  while ((m = IMG_SRC_RE.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

/** Build the full optimizer URLs a post will request. Exported for testing. */
export function optimizerUrlsForPost(
  post: { bodyHtml?: string | null; coverImageUrl?: string | null },
  origin: string,
): string[] {
  const base = origin.replace(/\/+$/, "");
  const targets = new Set<string>();

  // Body images render at a fixed w=1200&q=75 (proxyImageUrl default width).
  for (const url of collectBodyImageUrls(post.bodyHtml)) {
    targets.add(base + proxyImageUrl(url));
  }

  // Cover: next/image with a srcset. Warm each device width.
  const cover = post.coverImageUrl?.trim();
  if (cover && (/^https?:\/\//i.test(cover) || cover.startsWith("/"))) {
    for (const w of COVER_WIDTHS) {
      targets.add(
        `${base}/_next/image?url=${encodeURIComponent(cover)}&w=${w}&q=75`,
      );
    }
  }

  return [...targets];
}

/**
 * Warm the optimizer for every image in a post. Never throws — warming is a
 * best-effort optimization, so a failed fetch must not break publishing or
 * sending. Returns per-URL counts for logging.
 */
export async function prewarmPostImages(
  post: { bodyHtml?: string | null; coverImageUrl?: string | null },
  origin: string,
): Promise<{ warmed: number; failed: number; total: number }> {
  const urls = optimizerUrlsForPost(post, origin);
  if (urls.length === 0) return { warmed: 0, failed: 0, total: 0 };

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      // The optimization itself is the slow part we're paying for here, so give
      // each request generous headroom before aborting.
      const res = await fetch(url, {
        // Discard the bytes; we only care that the server produced + cached them.
        signal: AbortSignal.timeout(25_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Drain the body so the connection can close cleanly.
      await res.arrayBuffer();
    }),
  );

  const warmed = results.filter((r) => r.status === "fulfilled").length;
  return { warmed, failed: results.length - warmed, total: results.length };
}
