# Fix: newsletter images stall right after posting

## Diagnosis
Body + cover images render through Next's on-demand image optimizer
(`/_next/image?url=…`). Uploaded images are stored at **full resolution**
(30 MB cap, no downscale) in R2. The first request per image forces the
optimizer to download the multi-MB original and re-encode it. When the
newsletter email goes out, a burst of readers hit the cold, uncached images
at once → optimizer stalls → partial/black images. Once each optimized
derivative is cached, it's fast forever ("weeks-old newsletters are fine").

## Plan
- [x] 1. Downsize on upload — `src/lib/admin/uploads.ts`: `normalizeImage()`
      rotates → resizes to ≤2048px longest edge → re-encodes jpeg/png/webp q82;
      passes animated gif/avif through untouched. (Root cause.)
- [x] 2. Lazy-load body images — `src/lib/img-proxy.ts`: injects
      `loading="lazy" decoding="async"` on inline `<img>` (skips if author set
      a loading strategy).
- [x] 3. Pre-warm on publish/send — new `src/lib/admin/prewarm-images.ts`.
      Awaited in the "send all" path before the broadcast; fire-and-forget on
      publish (PUT). Warms the exact optimizer URLs (body w=1200&q=75, cover
      device widths).
- [x] 4. Verify — `tsc` clean, eslint clean, 10 new tests + full suite (102)
      green.

## Review
Root cause: full-resolution originals + Next's on-demand optimizer + a
cold-cache traffic burst from the email = stalled/partial images until each
derivative cached. Fix attacks all three: smaller sources (cheap first-hit),
lazy-load (smaller per-reader burst), pre-warm (cache hot before readers
arrive).

Notes / caveats:
- Downsizing applies to **new** uploads only. Already-posted images stay as-is
  (they're already cache-warm, so fine). To shrink historical images they'd
  need re-uploading — not needed for the reported symptom.
- Pre-warm targets `SITE.url` (production optimizer), so it warms the instance
  real readers hit even when triggered from a dev/admin session.
- `normalizeImage` is exported for testing; `MAX_EDGE = 2048`.

Files touched:
- src/lib/admin/uploads.ts
- src/lib/img-proxy.ts
- src/lib/admin/prewarm-images.ts (new)
- src/app/api/admin/posts/[id]/send/route.ts
- src/app/api/admin/posts/[id]/route.ts
- tests/newsletter-images.test.ts (new)
