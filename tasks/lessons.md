# Lessons

Running log of corrections, gotchas, and patterns to repeat. Reviewed at session start.

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
