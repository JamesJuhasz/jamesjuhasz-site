# Day 3 — Events + Gallery + Press

**Date:** 2026-05-03
**Reference:** `MIGRATION_PLAN.md` §Day 3 (Prompts 6–8)

## Shipped

### /events
Index — filter pills (All / Regatta / Training / Coaching) using `useState`, upcoming-pinned section, computed stats strip, reverse-chronological grid, two inline DonateCTAs.

### /events/[slug]
Editorial detail layout: hero with status + result badges, drop-cap body with end-of-body navy CTA card ("help fund the next one"), prev/next nav, sticky sidebar (DonateCTASidebar + related events). 7 events pre-rendered via `generateStaticParams`.

### /gallery
Bento-style varied-card grid. Per-gallery `toneHue` (HSL) drives the placeholder gradient. Cards scale-on-hover. 13 sub-galleries.

### /gallery/[slug]
Placeholder photo grid (12 tiles per gallery) with varied aspect ratios and shifted hues, "more from the campaign" related strip, donate close. Real photos + lightbox land Day 7.

### /press
Authority-signal layout: publications strip, divided list of mentions with external links, media inquiries card, quick-links sidebar.

## New seed
`src/lib/galleries.ts` — 13 sub-galleries (slugs match Squarespace folder names) with date ranges, photo counts, contextual notes, tone hues.

## Verification
- tsc clean
- next build: 28 routes — 7 events + 13 galleries + statics

## Deferred
- Real photos in galleries (Day 7)
- Lightbox / keyboard nav / swipe (Day 7 — `react-photo-album` was suggested in plan)
- Full 27 events (Day 5 Sanity import)
- Real press entries (Day 7 — pull from `./squarespace-backup/text-content/press.txt`)
