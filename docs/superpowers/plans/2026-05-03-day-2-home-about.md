# Day 2 — Home + About Pages

**Date:** 2026-05-03
**Branch:** `main` (worktrees deferred for batch execution)
**Reference:** `MIGRATION_PLAN.md` §Day 2 (Prompts 4–5)

## Shipped

### Home page (`src/app/page.tsx`)
Six sections per Prompt 4:
1. Hero — full-viewport gradient + wave SVG (photo lands Day 7)
2. Social proof bar — supporters + 4 animated training stats (203 days, 144 gym, 2762 km, 34 flights)
3. The stakes — emotional copy + $50 anchor stat in a navy card
4. Recent journey — 3 PostCards from `recentPosts` seed data
5. Upcoming/recent event — featured EventCard (large size)
6. The partnership ask — full-bleed navy panel with `<GivingTiers />`
+ Final inline DonateCTA

### About page (`src/app/about/page.tsx`)
Seven sections per Prompt 5:
1. Editorial hero — full-bleed gradient + display headline
2. The story — 70ch reading width, drop cap, two narrative sections
3. Inline DonateCTA at emotional peak (between story and timeline)
4. Career timeline — vertical alternating, 7 milestones from 2007 to 2026
5. Stats strip — 4 animated counters
6. Press & recognition — 3 press cards, link to /press
7. Final CTA band — primary donate + sidebar variant

### New primitives
- `Reveal` (framer-motion fade-in, honors prefers-reduced-motion)
- `HomeHero`, `CareerTimeline` (page-specific sections)
- `PostCard`, `EventCard` (reusable on /newsletters and /events Day 3+5)
- `GivingTiers` (reusable on /donate Day 4)
- `seed-data.ts` — typed seed (`SeedPost`, `SeedEvent`, `SeedPress`, `GivingLevel`) — shape mirrors planned Sanity schemas

## Verification
- `tsc --noEmit` clean
- `next build` static-renders all routes
- Dev server smoke test pending

## Deferred to Day 7
- Real hero photos (currently CSS gradients with wave SVG)
- Real portrait on /about (currently gradient block with figcaption note)
