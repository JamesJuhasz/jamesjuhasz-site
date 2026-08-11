/*
  Route image URLs through Next.js's image optimizer instead of having the
  browser fetch the public R2 cdn directly. The optimizer fetches server-side
  from Railway, which always resolves cdn.jamesjuhasz.com cleanly; clients
  whose DNS hasn't propagated the cdn record (NXDOMAIN at the resolver) would
  otherwise see broken images even though the bytes are reachable.

  Two helpers:
    - proxyImageUrl: wraps a single URL (used in admin form previews).
    - proxyImagesInHtml: rewrites every <img src="https://…"> in a chunk of
      user-authored HTML (used when rendering post/event body_html).

  blob: and data: URLs (placeholder previews during upload) and relative
  paths (e.g. /uploads/<orphan>.jpg) are passed through unchanged — proxying
  them would 500 the optimizer.
*/

export function proxyImageUrl(url: string, width = 1200): string {
  if (!url) return url;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

// Match `<img …src="https://…"`, requiring a whitespace before `src=` so we
// don't accidentally rewrite `data-src` or other src-suffixed attributes.
// `tag` is the `<img` open, `mid` is everything up to and including `src=`.
const IMG_SRC_RE = /(<img\b)([^>]*?\s)src="(https?:\/\/[^"]+)"/gi;

export function proxyImagesInHtml(html: string, width = 1200): string {
  if (!html) return html;
  return html.replace(
    IMG_SRC_RE,
    (_match, tag: string, mid: string, url: string) => {
      // Lazy-load inline body images so a single reader doesn't fire every
      // optimizer request on load — only images scrolling into view. This
      // spreads the per-page burst on Next's image optimizer. Skip if the
      // author's HTML already set a loading strategy.
      const attrs = /\sloading=/i.test(mid)
        ? ""
        : ' loading="lazy" decoding="async"';
      return `${tag}${attrs}${mid}src="${proxyImageUrl(url, width)}"`;
    },
  );
}
