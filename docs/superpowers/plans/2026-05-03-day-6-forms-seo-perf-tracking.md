# Day 6 — Forms + SEO + Performance + GA4 tracking

**Date:** 2026-05-03
**Reference:** `MIGRATION_PLAN.md` §Day 6 (Prompts 15–18)

## Shipped

### Form handlers (server)
- `/api/contact` — name + email + subject + message; zod validation; honeypot (`company` field); IP rate limit 5/hour; sends via Resend
- `/api/subscribe` — email + optional name; rate limit 5/hour
- `/api/name-my-boat` — name + email + suggested name + reason + opt-in subscribe; rate limit 10/hour
- `/api/clinic-registration` — full registration form; rate limit 5/hour

All four return `{ ok: true }` regardless on honeypot trip (silent acceptance).
All four use `src/lib/email.ts` (Resend wrapper) — when `RESEND_API_KEY` is unset, email is logged to console (dev-friendly).
All four use `src/lib/rate-limit.ts` (in-memory bucket; swap to Redis in multi-instance deploy).

### Form pages
- `/contact` rebuilt from ComingSoon stub — 4-field form, error toast, redirects to `/thank-you?from=contact`
- `/subscribe` already had form (Day 4) — now wired to `/api/subscribe` with GA4 tracking
- `/name-my-boat` and `/clinic-registration` (Day 4 pages) now wired with GA4 tracking on submit
- Footer `<SubscribeInline />` swapped from stub no-op to real `/api/subscribe` POST

### SEO
- `src/app/robots.ts` — disallows /studio /design-system /thank-you /api
- `src/app/sitemap.ts` — full sitemap including dynamic /newsletters/[slug], /events/[slug], /gallery/[slug]; revalidate hourly
- `src/app/api/og/route.tsx` — `next/og` `<ImageResponse>` for 3 variants (default, post, event); 1200×630, edge runtime, brand gradient
- Per-page metadata + OG image URLs:
  - Root layout uses default OG
  - `/donate` uses custom OG with "Help me get to LA 2028"
  - `/newsletters/[slug]` generates per-post OG with title + date
- JSON-LD structured data (`src/lib/json-ld.ts`):
  - Person on root layout (every page)
  - DonateAction on /donate
  - Article on newsletter detail
  - SportsEvent on event detail

### GA4 funnel tracking
- `src/lib/gtag.ts` — typed `track()` wrapper with named helpers: `trackDonateCtaClick`, `trackGivingLevelSelected`, `trackFormSubmitted`, `trackSubscribeSubmitted`
- `src/components/AnalyticsBridge.tsx` — root-mounted client component with click delegation:
  - Any element with `data-cta-location` → fires `donate_cta_click`
  - Any element with `data-giving-amount` → fires `giving_level_selected`
  - On `/donate` page mount → fires `donate_page_viewed`
- `donorbox_visible` already wired Day 4 in DonorboxEmbed
- `form_submitted` fired explicitly from each form page on success
- `subscribe_submitted` fired from /subscribe page + footer SubscribeInline (with `source` param: page / footer)

### Performance pass
- `next/font` for Fraunces + Inter (already done Day 1)
- Framer-motion only in `"use client"` islands
- Lucide-react imports are named-only (tree-shakeable)
- Sanity image loader uses `urlFor()` with width/fit constraints
- Donorbox embed lazy-loaded via `next/script` strategy="lazyOnload"
- All routes that don't read query params are static or ISR
- Lighthouse audit deferred to Day 8 deploy preview (needs prod build + real domain)

## Verification
- tsc clean
- next build clean — added /sitemap.xml, /robots.txt, /api/og to route list

## Required from user
- `RESEND_API_KEY` (free tier — resend.com)
- `RESEND_FROM_ADDRESS` (verified sender, e.g. `hello@jamesjuhasz.com`)
- `CONTACT_TO_ADDRESS` (where form submissions land)
- Real GA4 measurement ID swapped into `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Mark `giving_level_selected` and `donate_cta_click` as conversions in GA4 admin
