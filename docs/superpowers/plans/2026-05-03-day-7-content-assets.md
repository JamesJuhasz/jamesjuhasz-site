# Day 7 — Content port + asset curation

**Date:** 2026-05-03
**Reference:** `MIGRATION_PLAN.md` §Day 7 (Prompt 19)

## Shipped

### Content port
- Supporters list expanded from 4 → all 8 from real home.txt (Sport Canada, Canadian Sailing Team, Oakville Yacht Squadron, Devoti Sailing, Ontario Quest for Gold, Allen Sailing Hardware, Helly Hansen, Maurten)
- Training stats already real (203 days / 144 gym / 2762 km / now 10,352 km driven from home.txt)
- /donate budget categories rewritten with real numbers from donate.txt:
  - Travel: $9,000 (3 EU @ $1,500 + 1 AU @ $3,000 + 3 US @ $500)
  - Regatta entries + housing: $14,000 (5-6 events $350-650 + $800/mo rent)
  - Coaching + boat: $18,000
  - Equipment: $9,000 (4 sails × $850 + wetsuits + lines + food $30/day)
- /about story beats already match real about.txt narrative (7yo on parents' boat, sister, COVID move to Malta with SailCoach, year-round training)

### Hero picker (`/hero-picker`)
- 12 candidate JPEGs copied to `public/images/hero-candidates/`
- Picker page renders all 12 in a 3-col grid with `next/image fill`
- Shows file names, "open full" link, and pick instructions
- `noindex` metadata; remove route before Day 8 deploy

## Required from user
1. Visit `/hero-picker` → pick the strongest hero photo (criteria: action shot, athlete identifiable, dramatic ocean/sky, negative space for text)
2. Pick about portrait (same picker; user notes which file)
3. Source supporter logos — currently text-only; need actual logo files for: Sport Canada, Canadian Sailing Team, Oakville Yacht Squadron, Devoti Sailing, Ontario Quest for Gold, Allen, Helly Hansen, Maurten
4. Once picked: I optimize via sharp → .webp + .avif, wire into `<HomeHero />` and `<AboutHero />`, remove the picker route

## Deferred (manual)
- Real career timeline dates (currently approximate — needs user)
- Logo usage rights confirmation per supporter
- Personal video for /donate or /about (plan flagged as Day 10+)

## Verification
- next build clean — added /hero-picker to route list
