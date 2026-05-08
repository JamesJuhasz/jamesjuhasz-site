/*
  Admin previews route image URLs through `/_next/image` so the Next.js
  server fetches from R2 server-side. Direct browser → cdn.jamesjuhasz.com
  loads can fail (negative-cached 404s on just-uploaded keys, ad blockers,
  CDN security rules) while the optimizer's server-side fetch is reliable.

  Pass-through for blob:/data: (used as placeholders during upload).
*/
export function proxyImagePreview(url: string, width = 1200): string {
  if (!url) return url;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
