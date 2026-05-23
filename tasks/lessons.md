# Lessons

Running log of corrections, gotchas, and patterns to repeat. Reviewed at session start.

---

## 2026-05-22 — Don't ship `initial={{ opacity: 0 }}` on SSR'd framer-motion wrappers

**Context.** After fixing the dark-hero white-on-white issue, users on some mobile phones still reported huge blank sections of the site. Screenshots showed the mobile hamburger drawer opening to a completely empty white sheet (8 nav links missing) and the homepage rendering with most content below the hero invisible. Root cause: `Reveal` (`src/components/ui/Reveal.tsx`) used `<motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} />` and the mobile menu items in `Header.tsx` used the same shape (`initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`). Framer-motion's `initial` is serialized into the SSR HTML as inline `style="opacity: 0; transform: translateY(16px)"`. On devices where the client-side animation never fires (hydration race, IntersectionObserver edge case, aggressive battery saver, JS error elsewhere on the page, service-worker-cached stale JS) the content stays at `opacity: 0` forever — invisible. The home page has 32 `Reveal` usages, so a single client-side animation failure makes most of the site disappear.

**Rule.** SSR'd framer-motion wrappers must never have `opacity: 0` (or any other "make me invisible") in `initial`. If the animation fails to fire on the client, the user sees a blank page. Animate `y`, `scale`, or other transform properties instead — those degrade gracefully (worst case is a small static offset; the content remains visible).

**How to apply.**
- Translate-only reveals: `initial={{ y: 16 }} whileInView={{ y: 0 }}`. SSR emits `transform: translateY(16px)`; failure mode is a 16px static shift — barely perceptible, always legible.
- If a true fade is absolutely required, gate it behind a `useEffect`-set `mounted` flag so the SSR output renders fully visible and only the client (after hydration) starts the fade. Accept the brief "no-fade" first paint as the cost of safety.
- Animations on user-triggered states (e.g. the mobile drawer's stagger): also drop opacity. The drawer itself uses `translate-x-full → translate-x-0`, so item-level fade-in is decoration, not the reveal mechanic.
- Verification: `curl <url> | grep -oE 'opacity:[^;\"]*'` — the count must be zero (or only `opacity: 1`). Running it against `/` and `/newsletters` catches the most-used `Reveal` paths in one pass.

**Pattern to repeat.** Framer-motion's `initial` becomes static SSR style. Treat it as "the state the user will see if JS never runs" — design it to be readable on its own. Use animation to enhance the readable state, never to *create* it.

---

## 2026-05-22 — Dark-hero sections must own a dark `background-color`, not rely on the image

**Context.** Users on some mobile phones (across Safari *and* Chrome) reported intermittent white-on-white text in the navigation menu and in the `/newsletters` hero. Root cause: every hero (`HomeHero`, `/newsletters`, `/donate`, `/about`, etc.) overlays `text-paper` (white) on a hero image and a dark gradient, but the section itself had no `background-color`. Hero images are large (1–4 MB), priority-loaded, served via Next.js `<Image unoptimized>`, so on flaky cellular / content-blocker / older-iOS-format edges the image paints late or not at all — and the body's `bg-paper` (white) showed through. The transparent sticky `Header` overlaying the hero suffered the same fate. Symptom is mobile-only because mobile is the slow/blocked-image surface and matches the "some phones, intermittent, both browsers" pattern exactly.

**Rule.** Any section that places white text over a hero image MUST also carry a `background-color` matching the dark gradient endpoint (here, `bg-ink`). Don't rely on the image being painted to make the text legible. Same rule for an explicit `color-scheme` meta declaration: a light-mode site without it can be re-tinted by Chrome Mobile's "Auto Dark Theme for web contents," producing subtle inversions the design never anticipated.

**How to apply.**
- `HeroParallax`'s outer wrapper now ships `bg-ink` by default — most callers inherit the fix automatically. Any new hero that bypasses the component (e.g. the `<Image>` direct branch in `HomeHero` for mobile portrait crops) must add `bg-ink` itself to the absolute-positioned `-z-20` wrapper.
- For any future "white text on a photo" layout, set the section's *background-color* — not just the gradient — to the gradient's dark endpoint. The gradient is the *aesthetic* layer; the bg-color is the *safety* layer.
- Keep `viewport.colorScheme = "light"` in `src/app/layout.tsx`. Removing it re-opens the door to Chrome Auto Dark Theme algorithmically re-tinting `text-paper` / `bg-paper` pairs.
- Verification recipe: in `preview_eval`, set `visibility: hidden` on every `<img>` inside the hero, screenshot, and confirm the text is still legible. If it isn't, the bg-color is missing or the wrong layer is dark.

**Pattern to repeat.** When CSS depends on an asset loading to be readable, treat the asset as a *progressive enhancement*, not a hard requirement. Bake a same-palette fallback color into the same box so the text-contrast contract holds at every step of the load (and on every load that never finishes).

---

## 2026-05-22 — `background-image` on `<td>` with a spacer GIF is not bulletproof — Gmail mobile breaks it

**Context.** Newsletter and gallery-announcement emails sent via Resend rendered photos correctly on desktop (Apple Mail, Gmail web, Outlook) but showed blank gaps on mobile (Gmail iOS/Android). The `renderCroppedImage` helper in `src/lib/admin/newsletter-html.ts` used the "CSS background-image on `<td>` + 1×1 transparent spacer GIF sized via width/height attrs + `width:100%;height:auto`" technique to force a 16:10 crop. Gmail's mobile webview strips CSS `background-image` on `<td>` (and ignores the `background="..."` HTML fallback unless it's Outlook VML), so the only thing rendered is the invisible spacer = blank cell.

**Rule.** For images in email HTML, use a plain `<img>` with `display:block; width:100%; max-width:Wpx; height:auto;` and a `width="W"` HTML attribute. Accept the source's natural aspect ratio. Do not rely on `background-image`, `aspect-ratio`, or `object-fit` to force a crop in email — coverage across clients is too inconsistent and degradation is silent (invisible images, not broken-image icons).

**How to apply.**
- For email crops, do them server-side (image transformation) and serve a pre-cropped URL, OR drop the crop and use natural aspect.
- The spacer-GIF + background-image trick is widely quoted as "bulletproof" but it isn't — particularly fails on Gmail iOS, Gmail Android, Yahoo mobile, and AOL.
- The original comment in the code claimed `aspect-ratio` CSS gets stripped by Gmail — true historically, but Gmail web supports it since 2023. Mobile apps still lag. If we want a real crop in email later, the only reliable path is server-side pre-cropping.

**Pattern to repeat.** Email-safe responsive image: `<img src="..." width="W" alt="..." style="display:block; width:100%; max-width:Wpx; height:auto; border:0;" />`. Caller must absolutize relative URLs against the production origin (Resend won't proxy localhost).

---

## 2026-05-12 — Server-side fetches to third-party APIs need an explicit User-Agent in prod

**Context.** Upcoming-event destination photos worked locally but were missing in prod (Railway). Initial investigation chased lazy-loading and viewport theories on the wrong server. The user's redirect ("they load locally but not in prod") forced a re-frame: it had to be an environment difference, not a client-rendering issue. The actual root cause: `fetchWikipediaImage` and the opensearch / Brave search calls in `src/lib/venue-image.ts` had no `User-Agent` header. Wikipedia returns 403 for empty UAs and aggressively rate-limits / blocks anonymous-looking fetches from cloud-datacenter IPs (Railway), while letting them through from residential IPs. Result: every venue lookup returned null in prod and the prerendered HTML had zero `<img>` tags for upcoming cards.

**Rule.** Any server-side `fetch` to a third-party API in this codebase must set a descriptive `User-Agent` that names the app and includes a contact URL. Don't rely on Node's default UA — it's permissive enough to pass locally and fail silently in prod.

**How to apply.**
- For Wikipedia / MediaWiki specifically, follow the [User-Agent policy](https://meta.wikimedia.org/wiki/User-Agent_policy): `AppName/Version (https://contact-url; email)`.
- Pair the UA with `console.warn` on non-OK responses. Silent `catch { return null }` masked this for the entire lifetime of the feature.
- When a user says "works locally, broken in prod," skip browser-side theories until you've confirmed identical HTML between the two environments (`curl prod | grep <expected>` is fast).

**Pattern to repeat.** When investigating "image missing" or "data missing in prod" symptoms, first `curl` prod for the rendered HTML to see whether the data is absent at render time (server-side fetch failure) or present-but-not-displaying (client/CSS/lazy issue). One grep saves hours of viewport experiments.

---

## 2026-05-04 — Always source results from the federation, not pretrained guesses

**Context.** The `/results` page shipped with `seedResults` from `src/lib/seed-data.ts`, which contained `_guessed: true` placements (estimated based on tier patterns like "national → top 5"). The user flagged that "all results are wrong, and most of the events are wrong too." Replaced with verified data from the World Sailing profile (`https://www.sailing.org/sailor/james-juhasz?ref=CANJJ18`).

**Rule.** Athlete-facing performance data — placements, fleet size, dates — must trace to a federation/governing-body source. Never publish a guess. If a value isn't in a verified source, render `—`, not a number.

**How to apply.**
- World Sailing profile is the canonical source for ILCA 7 race history.
- The Nuxt SSR data blob (`window.__NUXT__=(function(...)...())`) on each profile page contains all 51+ events. Extract via the IIFE eval pattern in `scripts/fetch-world-sailing.ts`.
- Enrichment (venue, fleet size, news excerpt) is best-effort. When uncertain, leave the field null.
- `Result` UI already renders `—` for null fields — partial enrichment is honest.

**Pattern to repeat.** Layered fixtures: a fetch script writes the verified core to one JSON; a separate enrichment script writes optional metadata to another. Loader joins them. Both files checked in. No runtime fetch in build.

---

## 2026-05-04 — Don't `--refresh` without clearing stale fields on miss

**Context.** First pass of the news-enrichment scraper attached a 2023 article to a 2025 regatta because Google News matched the regatta name without verifying the year. After tightening to require a year-match, re-running with `--refresh-news` only *added* new excerpts; misses *preserved* the prior (incorrect) excerpts. So stale data persisted invisibly.

**Rule.** When a script's job is to *refresh* a field, a "miss" must clear the prior value (unless `_locked: true`). Otherwise tighter rules don't actually tighten output.

**How to apply.**
- Every refresh-style flag should imply: write a fresh value OR delete the field — never leave-as-was.
- Hand-curated rows protected by an explicit `_locked: true` flag.
- Test by deliberately tightening a filter and confirming previously-matched rows now show as missing, not stale.

---

## 2026-05-05 — Stop encoding pretrained venue guesses; scrape the regatta site

**Context.** First pass of `scripts/enrich-world-sailing.ts` had a `KNOWN` map of `{ regattaName + year → { location, countryCode } }` populated from memory of where each event "usually" is. The user spotted that the 2025 EurILCA Senior European Championships rendered as "Gdynia, Poland" but had been held in Marstrand, Sweden. Audit found further errors: 2024 ILCA 7 Worlds shown as Mar del Plata when actually Adelaide; 2022 Worlds inconsistent (`countryCode: MEX, location: Houston, TX, USA`).

**Rule.** When the regatta has an official website, scrape its title/meta/body for a city pattern. The hardcoded map is fallback-only for events with no website and never overrides scraped values.

**Why this is worth a lesson — not a one-off fix.** Pretrained "this regatta is usually in X" recall is statistically biased toward where it was MOST often, which lags the current calendar. The same shape of error will recur for any field where I substitute memory for a primary source.

**How to apply.**
- Any time I write a `KNOWN` lookup keyed by name+year, ask first: "is there a website I could scrape?" If yes, scrape and treat KNOWN as a fallback.
- For URLs that are class hubs (eurilca.org, ilcasailing.org root), reject them — hub pages cross-reference many events and bleed wrong venues. Only scrape event-specific paths/subdomains.
- When the URL itself contains an ISO3 country code (e.g. `…-eurilca-europa-cup-mlt/` → MLT), use it to filter scraped city matches. Without that filter, first-match-wins picks the wrong city when the page mentions multiple events.
- World Sailing regatta codes (`worldSailingRegattaCode`) are NOT a reliable host-country signal for class continental championships — those always carry the registering federation's code (e.g. EurILCA Senior Europeans always `FRA…` regardless of host). Don't trust the prefix.

---

## 2026-05-05 — Site-specific adapters are the only way past Sailti/M2S SPAs

**Context.** When verifying ILCA 7 result rows for 51 WS events, baseline Brave-search-only discovery left 28 events rejected. Most failures were SaaS scoring platforms (Sailti for Vilamoura/LB OCR/Sofia, Manage2Sail for Kieler/Allianz) where the homepage doesn't include result tables — they're behind a class-filter SPA or AJAX endpoint. The generic "find a Results link" adapter walks anchors but doesn't follow into AJAX/intermediate pages.

**Rule.** For each scoring platform family, build a dedicated adapter that emits the deterministic deep-link URL pattern. Don't rely on generic crawl + JS rendering — Playwright is expensive, slow, and doesn't reliably hit class-specific filters.

**How to apply.**
- **Sailti (Vilamoura, Long Beach OCR, Trofeo Sofia, US Open):** scoring lives at `scoring.sailti.com/public/download/overall-datetime-pdf/{raceId}/325/latest`. Walk the `race?text={slug}-en` page for `mnResults*_*` click handlers to get `id={raceId}&idsc2r={classKey}` — the resultsajax URL produces JSON; the scoring URL above produces a final-results PDF.
- **Manage2Sail (Kieler, Allianz):** event pages use deterministic slugs (`kiwo{YYYY}`, `AR{YY}`). Class drilldown is fully SPA — the bootstrapped `boostrapedResourceData.Regatta[]` JSON in static HTML maps class name → GUID, but the actual scoring data only loads via Angular `$resource` calls. For now, emit the event URL and let Playwright render; perfect class drilldown requires reverse-engineering the M2S API.
- **regattanetwork.com:** event pages link to an applet at `clubmgmt/applet_regatta_results.php?regatta_id={id}` which serves a static results HTML readable by extract-html. Pull `id` from the `regattanetwork.com/event/{id}` or `regatta_id={id}` URL.
- **sailingresults.net:** linked from older laser-worlds.com microsites, the index `/?ID=N` is just a TOC; the actual standings are at `/sa/results/overall.aspx?ID=N.1`. Always emit both.
- **eurilca.org blog posts** with year-coded event paths can be probed for a `eurilca.eu/documents/{id}/results/ilca7.htm` deep-link by walking inline anchors.

**Pattern to repeat.** Adapter contract: `matches(event): boolean` + `derive(event): Promise<URL[]>`. Register them before `GENERIC_RESULTS_LINK_ADAPTER`. Each adapter does one targeted HTTP fetch (no recursion). Test individual adapters with throwaway `scripts/_test-{site}.ts` calling `deriveAdapterUrls()` directly — much faster feedback than full pass.

**Anti-pattern.** Don't speculate slug variants beyond what the platform actually uses (e.g. `2026-{slug}-en` ≠ `{YYYY}{Slug}-en` — Sailti normalizes between camel-case and kebab-case across years/sites). Probe with curl first, then encode the rule.

---

## 2026-05-04 — World Sailing's `position` is a string, not a number

**Context.** The Nuxt JSON gives `crew.position` as `"3"` (string), and `typeof crew.position === "number"` quietly filtered every row out. Initial fetch wrote 51 events with `position: null` and the bug only showed up at the rendering layer.

**Rule.** Don't assume JSON-API types — coerce with a parser that handles both shapes and rejects non-positive integers.

**How to apply.**
- `parsePosition()` helper in `scripts/fetch-world-sailing.ts`: accepts `string | number | null`, returns `number | null`.
- Validate fixtures by asserting non-zero count of expected-positive rows after a fetch (e.g. `at least 80% have position !== null`).

---

## 2026-05-07 — Admin dashboard build

### Lesson: Sanity Studio is already an admin dashboard — don't rebuild it before checking.

**Pattern.** When the user asks for "an admin dashboard with CRUD," walk the
codebase first. We already had `/studio` (Sanity) doing the entire CRUD job
for the entities the user listed. The first plan I floated was to rebuild
that surface; the right answer was to keep it (or build a thin custom layer
on top) until the user had a reason to replace it.

**How to apply.** When a user asks for a feature, search for partial / full
implementations of the same surface before scoping new work. Then ask the
user whether they want to keep, extend, or replace what's there.

### Lesson: Postgres schema migrations with Drizzle want push semantics for first deploy.

**Rule.** Run `drizzle-kit generate` to produce a versioned `0000_init.sql`,
then a tiny `tsx scripts/db-migrate.ts` calling `migrate()` from
`drizzle-orm/node-postgres/migrator`. Don't rely on `drizzle-kit push` in CI —
it's interactive.

**How to apply.** `npm run db:migrate` is idempotent and runs in any environment
that has `DATABASE_URL`. Re-run it on every deploy.

### Lesson: TipTap can't directly load Sanity portable-text JSON.

**Rule.** Detect TipTap-shape JSON (`{ type: "doc", … }`) before passing as
`content`; otherwise fall back to HTML so TipTap parses the structure on
mount.

**How to apply.** `Editor.tsx` does `const isTiptapDoc = json?.type === "doc"`;
content-on-mount = either the doc, the HTML, or `""`.

### Lesson: Resend Broadcasts auto-handle unsubscribe — don't roll your own.

**Pattern.** When sending a Broadcast against an Audience, Resend injects
`List-Unsubscribe` headers and replaces `{{{RESEND_UNSUBSCRIBE_URL}}}` with
their hosted unsubscribe URL. No custom `/unsubscribe` page needed.

**How to apply.** In `src/lib/admin/newsletter-html.ts` we use that exact
placeholder in the footer. For test sends we substitute `#` so the link still
renders without the audience flow.

### Lesson: Railway has TWO postgres URLs — pick the right one for the runtime.

**Rule.** `DATABASE_URL` is internal-network only; `DATABASE_PUBLIC_URL` is
proxied via the public internet. For local dev / migration scripts, use
`DATABASE_PUBLIC_URL`. For the deployed app, link `DATABASE_URL` via Variable
Reference (faster + private network).

**How to apply.** `.env.local` in dev points at the public proxy. On Railway
the deployed service should use a Variable Reference to the Postgres
service's `DATABASE_URL`.

### Lesson: Local image hosting on Railway needs a Volume.

**Rule.** Railway's container filesystem is ephemeral — files written at
runtime disappear on the next deploy. Mount a Volume (e.g. at `/data/uploads`)
and set `UPLOADS_DIR=/data/uploads`. Local dev defaults to `./uploads`
(gitignored).

**How to apply.** `src/lib/admin/uploads.ts::getUploadsDir()` reads from the
env. Same code works in dev and prod once the Volume is mounted.

### Lesson: Next.js 16 renamed `middleware` → `proxy`.

**Pattern.** The file at `src/middleware.ts` with an exported `middleware`
function still works in Next 16 but emits a deprecation warning. Rename the
file to `src/proxy.ts` and the export to `proxy`.

**How to apply.** Already done. Future projects: skip the deprecated form
entirely.
