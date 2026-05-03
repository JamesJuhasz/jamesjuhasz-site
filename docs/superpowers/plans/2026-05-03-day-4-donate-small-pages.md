# Day 4 — Donate Page + Small Pages

**Date:** 2026-05-03
**Reference:** `MIGRATION_PLAN.md` §Day 4 (Prompts 9–10)

## Shipped

### /donate (the centerpiece)
Sections per Prompt 9:
1. Hero — half-viewport navy background; on the right, `<DonorboxEmbed />` above the fold
2. Giving levels — `<GivingTiers />` reused; clicking a tier deep-links `/donate?amount=N` which prefills the embed
3. Where your support goes — 4 budget cards (Coaching/Travel/Entries/Equipment) with %s + dollars + a horizontal stacked-bar chart
4. Trust — Canadian Sailing Team, direct campaign, year-round, 3 cards
5. Social proof — supporter quote + press quote (from /press)
6. FAQ — 5 accordion items via `<FAQ />`
7. Final CTA — display headline + anchor link back to `#give`

Donorbox embed: `<DonorboxEmbed />` reads `NEXT_PUBLIC_DONORBOX_CAMPAIGN_URL` and `NEXT_PUBLIC_DONORBOX_EMBED_ID`. When set, renders the iframe with `?amount=` prefill + lazy-loaded widget script. When not set, shows a clean fallback card. IntersectionObserver fires `donorbox_visible` GA4 event when the embed enters viewport (gtag wires up Day 6).

### /name-my-boat
Community engagement page. Form (name, email, suggested name, optional reason, opt-in subscribe) posts to `/api/name-my-boat` (route handler ships Day 6). Honeypot included. Submitted-names sample grid below. Soft donate CTA at the bottom.

### /clinic-registration
Two upcoming clinics card grid + registration form. Form posts to `/api/clinic-registration` (Day 6). Honeypot included.

### /thank-you
Context-aware via `?from=` query — distinct copy per source (donate, subscribe, name-my-boat, clinic-registration, contact, default). Soft secondary CTA to /newsletters and Instagram closes every variant.

### /subscribe
Single-page newsletter signup form posting to `/api/subscribe` (Day 6).

## New components
- `<DonorboxEmbed />` — iframe + `next/script` lazyOnload + intersection observer + fallback
- `<FAQ />` — accordion with grid-template-rows transition (no max-height jankiness)

## Verification
- next build clean — /donate and /thank-you are dynamic (server-rendered on demand) so they read `searchParams`. Day 6 perf pass can optimize.
- Deferred: end-to-end test transaction (needs real Donorbox campaign URL + embed ID)

## Required from user before Day 8 deploy
- `NEXT_PUBLIC_DONORBOX_CAMPAIGN_URL`
- `NEXT_PUBLIC_DONORBOX_EMBED_ID`
- Real budget numbers (currently estimates: 30/25/30/15)
- Real supporter testimonial quote (currently "Founding supporter, Oakville" placeholder)
