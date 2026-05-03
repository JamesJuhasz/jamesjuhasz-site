# Day 1 — Scaffold + Design System + Layout

**Date:** 2026-05-03
**Branch:** `main` (no worktree — plan says skip on Day 1)
**Reference:** `MIGRATION_PLAN.md` §Day 1 (Prompts 1–3)
**Goal:** A runnable Next.js 15 app with a conversion-aware design system and a layout shell that puts a Donate button on every page.

---

## Task 1 — Project setup (Prompt 1)

**Acceptance:**
- `npx create-next-app@latest .` produces TS + Tailwind v4 + App Router + src/ + ESLint structure.
- Production deps installed: `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `@vercel/og`, `zod`.
- GA4 wired via `@next/third-parties/google` with placeholder ID `G-XXXXXXXXXX` in root layout.
- One-line cookie notice in footer ("This site uses analytics cookies.").
- `git init`, sensible `.gitignore` (Next.js defaults + `.env.local`).
- `npm run dev` starts cleanly on http://localhost:3000.

**Files produced:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `.gitignore`, `.env.local.example`

---

## Task 2 — Design system (Prompt 2)

**Acceptance:**
- `globals.css` defines CSS variables + Tailwind v4 `@theme` block:
  - Colors: `--color-navy` (deep primary), `--color-foam` (off-white bg), `--color-sand` (warm accent), `--color-donate` (reserved high-contrast CTA — confident orange/red).
  - Typography: Fraunces (serif, headlines), Inter (sans, body) — loaded via `next/font`.
  - Type scale: display, h1, h2, h3, body-lg, body, caption.
  - Spacing: 4px base + semantic tokens (section-y, container-x, stack-sm/md/lg).
- Component primitives in `src/components/ui/`:
  - `Button` (variants: primary, secondary, ghost, donate)
  - `Card`
  - `Container`
  - `SectionHeader`
  - `Badge`
  - `StatNumber` (animated count-up via framer-motion)
- `cn()` helper at `src/lib/cn.ts` (clsx + tailwind-merge).
- `/design-system` route renders every primitive on one page (will be removed before launch — comment in the file).

**Constraints:**
- Donate color is reserved for donation CTAs only — separate Tailwind class so it stands out.
- No parallax. No autoplay. Subtle scroll reveals only.

---

## Task 3 — Layout shell (Prompt 3)

**Acceptance:**
- `src/components/layout/Header.tsx`:
  - Sticky, blurred-opaque on scroll.
  - Left: "James Juhasz" → `/`.
  - Center/right (desktop): Home, About, Events, Gallery, Newsletters, Press, Contact.
  - Far right: Donate button (donate color, reserved variant) — visible at every breakpoint.
  - Mobile: hamburger sheet shows nav links + full-width Donate button.
- `src/components/layout/Footer.tsx`:
  - Tagline + name.
  - Social icons (Instagram, YouTube — `#` placeholder URLs).
  - Quick links column.
  - Sponsor strip (Sport Canada, Canadian Sailing Team, Oakville YS, Devoti — text placeholders, real logos in Day 7).
  - Newsletter signup form (single email input, posts to `/api/subscribe` — handler stubbed).
  - Copyright + "Built by James" credit.
  - Cookie notice (one line).
- `src/components/cta/DonateCTA.tsx` — three variants:
  - `inline` — full-width band with headline + button.
  - `sidebar` — small card.
  - `floating` — bottom-right floating, mobile-only, after 50% scroll.
- `src/app/layout.tsx` mounts Header + Footer + floating DonateCTA on every route.
- Page list (route stubs to be confirmed; full content lands in Days 2–4):
  - `/`, `/about`, `/events`, `/gallery`, `/newsletters`, `/press`, `/contact`, `/donate`, `/subscribe`, `/name-my-boat`, `/clinic-registration`, `/thank-you`, `/design-system`.
  - Day 1 just creates `/`, `/design-system`, and a placeholder `/donate` (so the Donate button doesn't 404).

---

## Verification (before commit)

- `npm run build` passes.
- `npm run dev` → load `/` and `/design-system` — both render, no console errors.
- Donate button visible in header on `/`.
- Mobile width (375px): Donate button still in header; hamburger reveals nav + full-width Donate.
- No TypeScript errors (`tsc --noEmit`).
- ESLint clean (`npm run lint`).

---

## Out of scope (deferred)

- Real content (Day 2+ uses backup text).
- Hero image selection (Day 7).
- Real GA4 ID (pre-deploy in Day 8).
- Sanity / forms / Donorbox / SEO (Days 4–8).
- Subagent-driven dev split (Day 1 prompts have natural sequencing; subagents fire from Day 2).
