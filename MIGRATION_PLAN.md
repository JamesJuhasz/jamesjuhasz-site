# jamesjuhasz.com — Squarespace to Self-Built Migration Plan

**Primary goal:** **Maximize donations** to the Olympic campaign. Every UI decision, content choice, and page is in service of getting visitors to give — and to keep giving.

**Secondary goal:** Replace the $300/year Squarespace subscription with a self-built Next.js site on Railway.

**Estimated timeline:** ~9 active days (1–2 weeks part-time)
**Estimated annual cost after migration:** $0–48/year extra on top of existing Railway subscription

---

## Specialized skills used

This plan uses **two layers of skills**:

### Layer 1 — Working methodology (Superpowers)

The `superpowers` plugin (installed at `./Skills/superpowers-main/`) shapes *how* every Day's work gets done — the brainstorm-plan-execute-review-verify loop. These auto-trigger if the bootstrap is loaded. If they don't auto-trigger, invoke them explicitly with `Use the superpowers:{skill} skill.`

| Superpowers skill | When it fires |
|---|---|
| `superpowers:brainstorming` | Start of every Day — turns prompts in this plan into a real spec via Q&A |
| `superpowers:writing-plans` | After brainstorming — produces `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` |
| `superpowers:using-git-worktrees` | Before implementation — creates isolated worktree for the Day's branch |
| `superpowers:subagent-driven-development` | Implementation — fresh subagent per task, two-stage review |
| `superpowers:dispatching-parallel-agents` | When 2+ independent tasks (e.g., Day 3's three pages) |
| `superpowers:test-driven-development` | All code with logic (form handlers, import script, schema validation) |
| `superpowers:systematic-debugging` | When something breaks (Donorbox embed, Sanity import, etc.) |
| `superpowers:verification-before-completion` | Before claiming a Day is done |
| `superpowers:requesting-code-review` | After each Day, before merging |
| `superpowers:receiving-code-review` | When the reviewer flags issues |
| `superpowers:finishing-a-development-branch` | At the end of each Day to merge cleanly |

### Layer 2 — Domain expertise (Anthropic skills)

These shape *what* gets built — visual decisions, code idioms, copy. Lead specific prompts with `Use the {skill-name} skill.`

| Skill | Used for |
|---|---|
| `anthropic-skills:ui-designer` | Visual design system, typography, color, conversion-focused layout, hero sections |
| `anthropic-skills:senior-developer` | Premium implementation: animations, scroll effects, Three.js hero, pixel-perfect polish |
| `anthropic-skills:frontend-developer` | Next.js implementation, performance, image optimization, accessibility |
| `anthropic-skills:backend-architect` | Form handlers, Sanity schemas, donation tracking infrastructure, rate limiting |
| `anthropic-skills:instagram-curator` | Social-proof content strategy, share-optimized OG images, supporter content rhythm |

Layers compose: e.g., Day 4's `/donate` page uses `superpowers:test-driven-development` for the route handler **and** `anthropic-skills:senior-developer` for the visual treatment.

If a skill isn't installed, the prompt still works — Claude Code will do its best — but the specialist version produces noticeably better results.

---

## The Day Loop (apply to every Day from 1 onward)

Each Day follows the same superpowers-driven loop. Don't skip steps — they compound.

```
1. BRAINSTORM
   └── Use the superpowers:brainstorming skill.
       Hand it the relevant Day section as context.
       It Q&As you into a real spec, presents it for approval.

2. PLAN
   └── Use the superpowers:writing-plans skill.
       Outputs docs/superpowers/plans/YYYY-MM-DD-day-N-<topic>.md
       with bite-sized tasks, TDD-shaped, file paths included.

3. ISOLATE
   └── Use the superpowers:using-git-worktrees skill.
       Creates .worktrees/day-N-<topic>/ on a new branch.

4. EXECUTE
   └── Use the superpowers:subagent-driven-development skill.
       Dispatches a fresh subagent per task, two-stage review
       (spec compliance → code quality). For 2+ independent tasks
       (e.g., Day 3 Events/Gallery/Press), wrap with
       superpowers:dispatching-parallel-agents.

5. VERIFY
   └── Use the superpowers:verification-before-completion skill.
       Actually runs the test suite, Lighthouse, manual smoke
       test on /donate before claiming done. No "should work."

6. REVIEW
   └── Use the superpowers:requesting-code-review skill.
       Dispatches code-reviewer subagent.
       Use the superpowers:receiving-code-review skill when
       the feedback comes back — verify each item before
       implementing.

7. SHIP
   └── Use the superpowers:finishing-a-development-branch skill.
       Verifies tests pass one more time, presents merge options,
       cleans up the worktree.
```

**Skip the loop only for Day 0** (already done) and **Day 9 / Day 30+** (DNS / ongoing — different shape of work). Day 1 through Day 8 each go through all 7 steps.

---

## Conversion principles (apply to every page)

These come from research on athlete fundraising and nonprofit conversion. Bake them into every prompt — don't treat the donate page as the only conversion surface.

1. **Donation CTA on every page.** Sticky donate button in the header. Inline CTAs at natural emotional peaks (end of bio, end of newsletter posts, end of event recaps).
2. **Anchor with concrete asks.** Don't say "support my campaign." Say "$50 = one day of training in Europe." "$250 = entry fee for a regatta." "$1,000 = a month of housing in Malta." Pull real numbers from the existing Donate page content.
3. **Social proof everywhere.** Logos of Sport Canada, Canadian Sailing Team, Oakville Yacht Squadron, Devoti Sailing — not just on /home. Press mentions surfaced on /donate. Recent supporter count if Donorbox exposes it.
4. **Trust + authority signals.** "Member of Canadian Sailing Team" badge, ILCA 7 official affiliation, charity registration if applicable.
5. **Story over stats.** The /about page is a conversion engine, not a CV. Open with the most emotionally compelling moment. End with a donate CTA.
6. **Recurring > one-time.** Make monthly giving the default option in Donorbox (you can configure this in Donorbox settings; the embed inherits it).
7. **Reduce friction.** Donorbox embed must be above the fold on /donate. No multi-step flows. Mobile-first.
8. **Recent activity proves the campaign is alive.** Latest newsletter and latest event preview on the home page. Donors give to active athletes.
9. **Specificity beats abstraction.** "Training Camp in Mallorca, March 12–28" beats "upcoming European training."
10. **Urgency, ethically.** Olympic-cycle countdown ("LA 2028 — 3 years out"), upcoming event tied to a fundraising goal, world championship qualifying window.
11. **Visual hierarchy.** Hero must convey: who, what, what to do next. Sub-second comprehension.
12. **Performance is conversion.** Every 100ms of LCP delay loses ~1% of donations. Lighthouse 95+ is the bar, not 90.

---

## Final Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 + TypeScript + Tailwind CSS | App Router, src/ structure |
| Hosting | Railway | Same account as CoachAible |
| CMS | Sanity (free tier) | Embedded studio at /studio |
| Forms | Resend (3k emails/mo free) | Contact + subscribe + name-my-boat + clinic-registration |
| Donations | Donorbox (existing campaign) | Embed only — no migration |
| Analytics | Google Analytics 4 (free) + Donorbox built-in | Donation funnel tracking via GA4 custom events; Donorbox shows per-donation source/attribution natively |
| Domain | jamesjuhasz.com — keep at Squarespace registrar initially | DNS only changes |

---

## Prerequisites

Complete these before Day 1:

- [ ] Install Node.js 20+ ([nodejs.org](https://nodejs.org))
- [ ] Install Claude Code: `npm install -g @anthropic-ai/claude-code`
- [ ] Create accounts (free): [GitHub](https://github.com), [Sanity](https://sanity.io), [Resend](https://resend.com)
- [ ] Confirm Railway account is ready (already have this)
- [ ] **Squarespace audit** — fully automated in Day 0 below
- [ ] Note Donorbox campaign URL/embed code (log into Donorbox dashboard)
- [ ] Check Railway Usage tab to know current consumption baseline

---

## Day 0: Automated Site Backup & Asset Extraction (~30 min)

Before scaffolding anything, mirror the existing Squarespace site so all content, images, and pages are saved locally as reference material. This replaces the tedious "screenshot every page" step with a single Claude Code prompt.

Create a new folder for the migration project, `cd` into it, run `claude` to start Claude Code. Then use this prompt:

### Prompt 0 — Mirror the existing site
```
Before we build anything, I need to back up my current Squarespace site at
https://www.jamesjuhasz.com so we have all content and images as reference.
Please do the following:

1. Check whether wget is installed by running `wget --version`. If it's not,
   tell me how to install it via Homebrew before continuing.

2. Create a folder structure inside this project:
   - ./squarespace-backup/        (root for everything)
   - ./squarespace-backup/mirror/  (full site mirror will go here)
   - ./squarespace-backup/all-images/  (flattened images)
   - ./squarespace-backup/text-content/  (extracted clean text per page)

3. Run a wget mirror of https://www.jamesjuhasz.com into ./squarespace-backup/mirror/
   using these flags: --mirror --convert-links --adjust-extension
   --page-requisites --no-parent --wait=1 --random-wait, with a realistic
   browser user-agent string. Add --execute robots=off since this is my own
   site. Show me the progress as it runs.

4. After the mirror completes, find every image file (.jpg, .jpeg, .png, .webp,
   .gif, .svg) inside the mirror and copy them all into
   ./squarespace-backup/all-images/ as a flat folder for easy reuse later.

5. For each HTML page in the mirror, extract the readable text content
   (stripped of HTML tags, navigation chrome, and footer boilerplate) and save
   it as a .txt file in ./squarespace-backup/text-content/ — one file per page,
   named after the page slug. Use a Node script with a library like
   `node-html-parser` or Python with `beautifulsoup4`, whichever is easier.

6. Also fetch https://www.jamesjuhasz.com/sitemap.xml and save it as
   ./squarespace-backup/sitemap.xml so I have a master list of all pages.

7. When done, give me a summary report: total pages mirrored, total images
   extracted, total disk size of the backup, and a sample listing of the
   text-content folder so I can spot any pages we missed.
```

### What you'll have after Day 0
```
./squarespace-backup/
├── mirror/                     ← full offline copy, click index.html to browse
│   └── www.jamesjuhasz.com/
├── all-images/                 ← every image, flat folder, ready to drop into
│   ├── hero.jpg                  /public/images/ in the new Next.js project
│   ├── portrait.jpg
│   └── ...
├── text-content/               ← clean text per page for easy copy/paste
│   ├── home.txt
│   ├── about.txt
│   ├── sailing.txt
│   └── ...
└── sitemap.xml                 ← master URL list
```

This becomes your reference material for every subsequent day. When Day 2 says "use lorem ipsum for now," you can instead say "use the content in `./squarespace-backup/text-content/about.txt`" and Claude Code will port your real content directly.

### Common issues during Day 0

- **403 Forbidden on every page:** Squarespace blocked the user-agent. Tell Claude Code: "Use a more realistic user-agent string from a current Chrome browser and retry."
- **Mirror feels incomplete:** Tell Claude Code to also pull the URLs listed in `sitemap.xml` directly with individual wget calls, in case the recursive crawler missed any.
- **Images look low-res:** Squarespace serves responsive images. The mirror gets whatever was referenced in the HTML. For absolute-highest-resolution originals, you can additionally export from your Squarespace asset library — but for design reference and re-use on the new site, the mirrored versions are usually fine.

---

## Day 1: Scaffold + Design System + Layout (~4 hrs)

Create a new project folder, `cd` into it, run `claude` to start Claude Code.

> **Run the full Day Loop:** brainstorming → writing-plans → using-git-worktrees → subagent-driven-development → verification-before-completion → requesting-code-review → finishing-a-development-branch.
>
> Day 1 is unusual — there's no existing branch to worktree from. Skip the worktree step and run scaffold + plan on `main`. From Day 2 onward use the worktree pattern.

### Prompt 1 — Project setup
```
Use the anthropic-skills:frontend-developer skill.

Set up a new Next.js 15 project in this directory called "jamesjuhasz-site"
with TypeScript, Tailwind CSS v4, the App Router, ESLint, and the src/
directory structure. Add these production dependencies up front since we'll
need them: framer-motion (scroll animations), lucide-react (icons), clsx +
tailwind-merge (className composition), @vercel/og (dynamic OG images), and
zod (form validation). Initialize a git repo with a sensible .gitignore.

Set up Google Analytics 4 by adding the gtag.js script to the root layout
via @next/third-parties/google (which handles loading optimization). Use a
placeholder GA4 measurement ID — I'll provide the real one before deploy.
Add a one-line cookie notice (Canadian site, GDPR not required but a brief
notice is good practice).

After setup, show me the folder structure.
```

### Prompt 2 — Conversion-focused design system
```
Use the anthropic-skills:ui-designer skill.

I'm rebuilding my personal site for my Olympic sailing career. The PRIMARY GOAL
of the site is maximizing donations to my campaign. The vibe should be: clean,
athletic, premium, trustworthy — think Patagonia × NYT athlete profile, NOT a
fundraiser-style site that screams "give money." Restraint converts better than
desperation.

Reference material: the full mirror of my current Squarespace site is at
./squarespace-backup/mirror/www.jamesjuhasz.com/ — open index.html and a few
inner pages. Also browse ./squarespace-backup/all-images/ for visual tone
(sailing photography, ocean palette).

Build a comprehensive design system:

1. Color palette — derived from sailing photography: deep navy primary, ocean
   foam off-white background, warm sand accent, a single high-contrast CTA
   color (recommend a confident orange/red that survives on photo backgrounds
   — this color is reserved for donation CTAs only, used sparingly so it pops).

2. Typography — pair a modern editorial serif (e.g. "Fraunces" or "Newsreader")
   for headlines with a clean grotesque sans (e.g. "Inter" or "Geist") for body.
   Define a precise type scale: display, h1, h2, h3, body-lg, body, caption.
   Set comfortable line heights.

3. Spacing scale — 4px base, with semantic tokens (section-y, container-x,
   stack-sm/md/lg).

4. Component primitives — Button (primary/secondary/ghost/donate variants —
   "donate" is the reserved CTA color), Card, Container, SectionHeader, Badge,
   StatNumber (large animated counter for "$X raised", "Y supporters").

5. Motion language — subtle scroll reveals via framer-motion, no parallax that
   tanks performance, no auto-playing video.

Output: src/app/globals.css with CSS variables, tailwind.config.ts extending
the theme, and a /design-system route showing every primitive on one page so
I can review at a glance. Don't ship the /design-system route to production —
just for review.
```

### Prompt 3 — Conversion-aware layout shell
```
Use the anthropic-skills:ui-designer skill.

Build the site's layout shell with donation conversion baked into the chrome:

1. Sticky navigation header
   - Left: "James Juhasz" name as logo, links to /
   - Center/right: Home, About, Events, Gallery, Newsletters, Press, Contact
   - Far right: a high-contrast "Donate" button (using the reserved donate
     color from the design system) — visible on every page, every screen size,
     including mobile (where it stays in the header even when the hamburger is
     closed). This is non-negotiable.
   - Header becomes opaque/blurred on scroll so it stays legible over photos.
   - Mobile hamburger reveals the same nav links plus a full-width Donate
     button at the bottom of the sheet.

2. Footer
   - Brief tagline + name
   - Social media icons (Instagram, YouTube — placeholder URLs)
   - Quick links column (mirrors header)
   - Sponsor/affiliation strip: small monochrome logos of Sport Canada,
     Canadian Sailing Team, Oakville Yacht Squadron, Devoti Sailing
   - Newsletter signup (single email input → /subscribe handler)
   - Copyright line + a small "Built by James" credit

3. A reusable <DonateCTA /> component — three variants:
   - "inline" — full-width band with headline + button, for end of pages
   - "sidebar" — small card for blog post sidebars
   - "floating" — bottom-right floating button on mobile only after 50% scroll
   Use this component liberally on subsequent pages.

Apply this layout via the root layout file. Do not block-render any heavy
component — keep TTFB tight.
```

> **Page inventory (from real Squarespace site, captured Day 0):**
> Pages: `/` (home), `/about`, `/contact`, `/donate`, `/press`, `/subscribe`, `/name-my-boat`, `/clinic-registration`, `/thank-you`. Collections: `/newsletters` (blog, 20 posts), `/events` (27 race/training entries), `/gallery` (13 sub-galleries).

---

## Day 2: Home + About Pages (~4 hrs)

> **Day Loop:** brainstorm both pages first (the home page has 6 sections, brainstorming is high-value here), then plan, worktree, parallel-agents (home and about are independent), verify, review, ship.
>
> Use `superpowers:dispatching-parallel-agents` — Home and About are independent and can be built concurrently by separate subagents. Two parallel subagent tracks → ~2x throughput.

### Prompt 4 — Home page (conversion-optimized)
```
Use the anthropic-skills:senior-developer skill for implementation, and the
anthropic-skills:ui-designer skill for visual design decisions.

The home page has ONE job: convert a first-time visitor into a donor or a
subscriber. Structure (top to bottom):

1. HERO — full-viewport, 100vh
   - Background: full-bleed sailing action photo (use a placeholder from
     ./squarespace-backup/all-images/, pick the strongest hero candidate
     and tell me which file)
   - Subtle gradient overlay at bottom for text legibility
   - Foreground: my name (display type), tagline "Olympic ILCA 7 Sailor —
     Road to LA 2028", a one-line emotional hook (placeholder I can edit:
     "Chasing Olympic gold from the Great Lakes to the Mediterranean")
   - Primary CTA: "Support the Campaign" → /donate (donate-color button,
     prominent)
   - Secondary CTA: "Read the Journey" → /newsletters (ghost button)
   - Subtle scroll-down indicator

2. SOCIAL PROOF BAR — immediately under hero
   - Single horizontal strip: "Backed by" + monochrome logos of Sport Canada,
     Canadian Sailing Team, Oakville Yacht Squadron, Devoti Sailing
   - One-line stat row: career highlights as 3-4 stat cards with animated
     counters (e.g. "12+ International Regattas", "5 Countries Trained In",
     "Member, Canadian Sailing Team") — placeholders I can update

3. THE STAKES — single section, "Why this matters"
   - Tight emotional copy explaining the campaign in 3-4 sentences
   - "$50 funds a day of training in Europe" anchor stat (large display
     number, animated count-up on scroll)
   - Inline DonateCTA component

4. RECENT JOURNEY — newsletter preview strip
   - "Latest from the road" headline
   - Three most recent /newsletters posts as cards (cover image, title,
     date, 1-line excerpt) — pull from Sanity once available, hardcode for
     now
   - "Read all updates" link → /newsletters

5. UPCOMING / RECENT EVENT — single event hero card
   - Big image, event name, date, location, status (Upcoming / Just raced)
   - One-line result if past, one-line goal if upcoming
   - Link to /events/[slug]

6. THE PARTNERSHIP ASK — final inline DonateCTA band, full-width
   - Three giving tiers visible: $50 / $250 / $1,000 with what each unlocks
   - Single button "Join the Campaign" → /donate
   - This is the page's emotional close

Use generous whitespace, scroll-reveal motion (framer-motion, subtle), and
the design system. Do NOT use heavy animations — keep LCP under 2.0s on a
mid-tier mobile.
```

### Prompt 5 — About page (story as conversion engine)
```
Use the anthropic-skills:ui-designer skill.

The /about page is a conversion engine, not a CV. Visitors who finish reading
should feel emotionally invested enough to donate. Structure:

1. EDITORIAL HERO — full-bleed portrait, large display headline overlaid:
   "From a 7-year-old on the Great Lakes to chasing Olympic gold."
   (Placeholder — I'll edit to taste later.)

2. THE STORY — long-form editorial layout, ~70ch reading width
   - Two or three sections with subheads, drop caps, pull quotes
   - Inline images sprinkled throughout (sailing across the years —
     pull placeholders from ./squarespace-backup/all-images/)
   - Use the bio text from ./squarespace-backup/text-content/about.txt as
     the seed; I'll polish later
   - Reading time indicator at top

3. CAREER TIMELINE — clean vertical timeline
   - Major milestones with year, event, location, brief outcome
   - Visual treatment: alternating left/right cards on desktop, stacked
     on mobile, with subtle scroll-reveal
   - Placeholders sourced from /events backup; I'll fill real dates

4. STATS STRIP — 4 stat cards: Class, Home Base, Years Competing, Major
   Results. Animated counters where numeric.

5. PRESS & RECOGNITION — small horizontal scroller of press logos linking
   to /press

6. INLINE DONATE CTA — at the emotional peak (end of story section, before
   timeline), use the inline DonateCTA component with copy like
   "If this story resonates, consider joining the campaign."

7. FINAL CTA BAND — at page bottom: "Help me get to LA 2028" with primary
   donate button + secondary "Get updates" subscribe link

Read the existing about.txt content carefully. The story has emotional
beats: childhood on the lake, the COVID move to Malta, the Olympic dream.
Surface those beats — don't bury them in lorem ipsum.
```

---

## Day 3: Events + Gallery + Press Pages (~4 hrs)

> Real-site replaces the original plan's separate "Sailing" and "Sponsors" pages.
> Sponsors live on the home page Supporters grid. Race history lives at /events.
> Each of these pages should also serve donation conversion — no dead-end pages.
>
> **Day Loop:** This Day is the canonical use case for `superpowers:dispatching-parallel-agents`. Three independent pages, no shared state. After brainstorming + planning, dispatch three subagents concurrently (one per page). Coordinator stitches results. Then verify, review, ship.

### Prompt 6 — Events page (race log + conversion)
```
Use the anthropic-skills:frontend-developer skill.

Build /events — my race/training log, ALSO a conversion surface (donors give
to athletes who are visibly active).

Index page (/events):
- Hero: "The Campaign Trail" headline + 1-line copy + a small stats strip
  ("X regattas raced", "Y countries", "Z training days")
- Filter pills: All / Regattas / Training / Coaching (single-tap filter)
- Reverse-chronological card grid — each card: cover photo, title, date,
  location, status badge (Upcoming/Recent/Past), result line if applicable
- An "Upcoming" section pinned at top if any future events exist
- Mid-page: inline DonateCTA band — copy like "Each event is a chance to
  earn Olympic qualification points. Help me make it to the next start line."
- Bottom: another DonateCTA before footer

Event detail page (/events/[slug]):
- Editorial layout: hero image, title, date, location, optional result
- Body content (long-form prose with images, like a race diary)
- Sidebar (desktop) / footer (mobile): related events + sticky DonateCTA
- "Was this useful? Help fund the next one →" inline CTA at end of body

For now, hardcode 27 events from the existing backup. We'll move to Sanity
on Day 5. Make the page handle 100+ events without performance issues —
paginate or virtualize if needed.

Performance bar: LCP < 2.5s, CLS = 0, no layout shift on image load
(reserve aspect ratios with next/image fill).
```

### Prompt 7 — Gallery page (visual storytelling)
```
Use the anthropic-skills:senior-developer skill for the gallery interactions
and the anthropic-skills:instagram-curator skill for layout decisions about
which photos showcase best for emotional impact.

Build /gallery as an index of sub-galleries. The real site has 13 sub-galleries:
malta-summer-2020, malta-winter-202021, spring-2020, spring-2021, fall-2020,
fall-2021, uk-summer-2021, winter-202122, spring-2022, summer-2022, fall2022,
fall2022-dy898, spring-2023, 2017-2018-2019.

Index page (/gallery):
- Hero: title + 1-line lead
- Editorial grid of sub-gallery cards — varying card sizes (Bento layout)
  to make it feel curated, not templated. Each card: cover image, gallery
  title, date range, photo count
- Subtle scroll-reveal on cards
- Mid-page DonateCTA inline band

Sub-gallery page (/gallery/[slug]):
- Title + date range + 1-line context
- Masonry grid of photos (use react-photo-album or similar; pre-compute
  aspect ratios to avoid CLS)
- Click → fullscreen lightbox with keyboard nav, swipe on mobile, image
  pre-load for next/prev
- End-of-gallery: "More from this season" suggesting related newsletter
  posts and events; final inline DonateCTA

Source photos from ./squarespace-backup/all-images/ (we have ~950). Don't
ship them all to /public — too heavy. Plan to upload to Sanity on Day 5;
for Day 3 use a small curated subset (5-10 per gallery) so we can iterate.

Performance bar: progressive image loading, LCP under 2.5s, never load
all images at once.
```

### Prompt 8 — Press page (authority signals)
```
Use the anthropic-skills:ui-designer skill.

Build /press — a list of media mentions. This page is pure authority
signaling. Layout:

- Hero: "Media & Recognition" headline, 1-line lead
- Optional logo strip: logos of every publication that's covered me,
  monochrome, 1 row
- Reverse-chronological list of mentions:
  - Each: publication name, article title, date, 1-line excerpt
  - Optional small logo
  - External link icon → opens article in new tab
  - Subtle hover state
- Bottom: "For media inquiries" small card → /contact
- Inline DonateCTA before footer — "Like what you've read? Help me write
  the next chapter."

Pull seed entries from ./squarespace-backup/text-content/press.txt. Even
if there are only a few mentions, design for graceful display of 1, 5, or
50+ entries.
```

---

## Day 4: The Donate Page (Conversion Centerpiece) + Smaller Pages (~5 hrs)

> This is the most important page on the site. Spend the time.
>
> **Day Loop:** Spend extra time in brainstorming. The /donate page rewards careful design — make sure the spec captures every section, every CTA, every analytics event before any code is written. Use `superpowers:test-driven-development` for the giving-level → Donorbox URL builder logic (it's pure function, easy to test, and a bug here silently loses donations). After Donorbox embed integration, expect debugging — wrap with `superpowers:systematic-debugging` rather than guessing at fixes.

### Prompt 9 — Donate page (the conversion centerpiece)
```
Use the anthropic-skills:senior-developer skill for the build, and the
anthropic-skills:ui-designer skill for layout/copy decisions. Apply
nonprofit conversion research: anchor with concrete giving levels, use
trust signals heavily, surface social proof, reduce friction.

Build /donate — the page where most of the site's value is realized.
Structure (top to bottom, every section earns its place):

1. HERO — half-viewport, NOT full
   - Tight headline: "Help me get to LA 2028."
   - One-paragraph emotional pitch (placeholder I'll polish): the journey,
     the goal, the cost, the request
   - DONORBOX EMBED — above the fold, properly sized so the form is the
     visual focal point. Embed code goes here:
     [paste Donorbox embed code here when ready]
   - Use next/script with strategy="afterInteractive" for the Donorbox
     loader script. If embed fails to render, show a fallback "Donate via
     Donorbox →" button linking directly to the campaign URL.

2. GIVING LEVELS — below the embed
   - Three or four cards: $50, $250, $1000, Custom
   - Each card has a concrete outcome:
     · $50 — "One day of training in Europe"
     · $250 — "Entry fee for an international regatta"
     · $1,000 — "A month of housing in Malta"
     · Custom — "Whatever feels right. Every contribution moves me forward."
   - Clicking a card pre-fills the Donorbox amount if possible (Donorbox
     supports `?amount=` query param on the campaign URL — use it).
   - Subtle "Most supporters give monthly" hint to nudge recurring.

3. WHERE YOUR SUPPORT GOES — visual breakdown
   - 4 icon-cards explaining cost categories: Coaching, Travel, Equipment,
     Entry Fees
   - Each card with a real percentage / dollar figure (placeholder I'll
     update from real budget)
   - Optional: a horizontal bar chart showing budget allocation

4. TRANSPARENCY + TRUST
   - "I'm a member of the Canadian Sailing Team" badge with logo
   - "Sport Canada carded athlete" if applicable
   - Brief note on tax receipts (if available — I'll confirm)
   - Charity registration if applicable

5. SOCIAL PROOF
   - "Recent supporters" — Donorbox can expose a public donor wall; if not,
     use a static testimonial card from a real supporter
   - Press mention quote pulled from /press
   - Photo of recent training/event

6. FAQ — accordion
   - "Where does my donation go?"
   - "Is this tax-deductible?"
   - "Can I give monthly?"
   - "Can I sponsor specific equipment?"
   - "How do I get updates?"

7. FINAL CTA — large band
   - "Every dollar gets me closer to the start line." + secondary donate
     button (anchor link back to the embed at top)

Performance: Donorbox loads its own scripts/styles. Lazy-load the embed if
needed. Page must still hit Lighthouse performance > 90.

Track in GA4: page view, embed visible (intersection observer),
"giving_level_selected" custom event for each tier (with `amount` param).
```

**Critical test:** run `npm run dev`, load /donate, confirm widget renders, complete a test transaction (use Stripe test mode in Donorbox) before moving on. Verify mobile layout — Donorbox embed must not break on small screens. Test the "?amount=" pre-fill.

### Prompt 10 — Name My Boat + Clinic Registration + Thank You
```
Use the anthropic-skills:frontend-developer skill.

Build three smaller pages — keep the same conversion mindset (each ends with
a DonateCTA component):

1. /name-my-boat — community engagement page where supporters submit boat
   name suggestions. This is itself a soft conversion — submitters become
   newsletter subscribers if they opt in. Reference content at
   ./squarespace-backup/text-content/name-my-boat.txt. Form fields: name,
   email, suggested boat name, optional reason for the name, optional
   "subscribe to updates" checkbox (default checked). Wire to Resend — but
   stub the route handler for now (Day 6 wires it up). On submit → redirect
   to /thank-you?from=name-my-boat. Below the form, show a fun grid of
   submitted names (Sanity-backed, defer wiring; stub layout for now).

2. /clinic-registration — sign-up page for sailing clinics I run. This is
   a small revenue stream. Reference content at
   ./squarespace-backup/text-content/clinic-registration.txt. Form fields:
   name, email, age, sailing experience level (Beginner/Intermediate/
   Advanced/Pro), notes. Show available clinics as cards above the form
   (placeholder data — stub).

3. /thank-you — post-form-submission landing page. Different copy depending
   on `?from=` query param: contact, subscribe, name-my-boat, clinic-
   registration, donate. Reference ./squarespace-backup/text-content/
   thank-you.txt. End the page with a soft secondary CTA: "While you're
   here, follow along →" linking to /newsletters and Instagram.
```

---

## Day 5: Sanity CMS Setup + Newsletters + Events Migration (~5 hrs)

> The blog lives at `/newsletters` to preserve URL compatibility with the
> existing site (20 posts already at /newsletters/[slug]). Old URLs continue
> working without redirects.
>
> **Day Loop:** The bulk import script is the riskiest piece in the entire migration — a bad import can corrupt 20 posts + 27 events with HTML conversion artifacts and you won't notice for weeks. Apply `superpowers:test-driven-development` rigorously to the import script (Prompt 13): write tests for HTML→portable-text conversion edge cases (nested lists, blockquotes, inline images, captions) BEFORE running it against the full dataset. Verify against a small subset first.

### Prompt 11 — Sanity setup
```
Use the anthropic-skills:backend-architect skill.

Set up Sanity CMS for this Next.js project. Use the embedded studio approach
so the studio runs at /studio on my own domain. Create these schemas:

1. "post" (newsletters): title, slug (auto from title), publishedAt, excerpt
   (max 200 chars), coverImage (with hotspot + alt text), body (portable text
   with custom blocks for inline images, pull quotes, and an "inline-donate-
   cta" block I can drop into long posts), tags (array of strings),
   featured (boolean — surfaces on home page).

2. "event" (race log): title, slug, eventDate, endDate (optional, for
   multi-day events), location, resultPosition (optional string), category
   (enum: Regatta / Training / Coaching), coverImage, body (portable text),
   relatedPosts (refs to "post"), upcoming (boolean derived from date).

3. "pressMention": publication, articleTitle, publishedAt, externalUrl,
   logo (image, optional), excerpt (string, optional, 1-line).

4. "supporter" (sponsors/affiliations): name, logo (image), tier (enum:
   Foundation / Major / Sustaining), websiteUrl, displayOrder (number),
   showOnHome (boolean). Pre-seed with Sport Canada, Canadian Sailing Team,
   Oakville Yacht Squadron, Devoti Sailing.

5. "givingLevel" — for the /donate page. Fields: amount (number), label,
   outcome (string, e.g. "One day of training in Europe"), displayOrder.
   Lets me change giving levels without code changes.

Walk me through every step: creating the Sanity project via CLI, getting my
project ID, setting up environment variables (NEXT_PUBLIC_SANITY_PROJECT_ID,
NEXT_PUBLIC_SANITY_DATASET, SANITY_API_READ_TOKEN, SANITY_API_WRITE_TOKEN
for the import script), and the GROQ queries I'll need.
```

### Prompt 12 — Newsletters + Events UI wired to Sanity
```
Use the anthropic-skills:frontend-developer skill.

Wire /newsletters and /events to Sanity (replacing the hardcoded data from
Day 3). For /newsletters:
- Index: card grid sorted newest first, supports tag filter via ?tag= query
- /newsletters/[slug]: editorial layout — generous typography (~70ch), proper
  heading hierarchy, in-flow images, pull quotes, the inline-donate-cta block
  rendered using the DonateCTA "inline" variant
- "Next post" / "Previous post" navigation at end
- Sticky DonateCTA on desktop sidebar

For /events:
- Same wiring pattern with the event schema
- Upcoming events surface a "Cheer me on" inline CTA linking to /donate
- Past events surface a "Help fund the next one" inline CTA

Both routes use ISR with revalidate=60. Configure on-demand revalidation
via a Sanity webhook → /api/revalidate so new posts appear instantly.
```

### Prompt 13 — Bulk import from Squarespace export
```
Use the anthropic-skills:backend-architect skill AND the
superpowers:test-driven-development skill — this script is high-risk.
Write tests FIRST for the HTML-to-portable-text converter, run them red,
implement minimum to pass, refactor. Tests must cover: nested lists,
blockquotes, inline images with captions, links, headings, code blocks,
empty paragraphs, and Squarespace-specific markup ([caption] shortcodes).
Do not run the import against the full dataset until all converter tests
pass. Run against a 3-item subset first, verify in /studio, then run full.

Write a one-shot Node script (scripts/import-from-export.ts) that reads
./squarespace-backup/squarespace-export.xml and creates Sanity documents:

- post_type=post → "post" document
- post_type=page where link starts with /events/ → "event" document
- post_type=page where link starts with /gallery/ → defer (Day 7 task)
- Skip pages that map to static routes (home, about, contact, donate, press,
  subscribe, name-my-boat, clinic-registration, thank-you)

For each item:
- Parse content:encoded HTML
- Convert to portable text using @sanity/block-tools' htmlToBlocks
- Preserve images: find references to images in the HTML, find matching
  files in ./squarespace-backup/all-images/ by basename, upload to Sanity's
  asset pipeline, replace HTML <img> with portable-text image blocks
  pointing to the new Sanity assets
- Preserve original publishedAt
- Generate slug from the link path (last segment)
- For events: detect category by keyword scan ("training" / "regatta" /
  "coaching" — fall back to "Regatta")

Make the script idempotent: re-running with the same data updates existing
documents (use deterministic _id like `post-${slug}`).

After running: /newsletters shows 20 posts with images intact, /events shows
27 events. Fix any conversion artifacts (broken pull quotes, missing images,
stripped formatting).
```

### Prompt 14 — Test the CMS flow + giving levels seed
```
1. Walk me through publishing a test post: I'll go to /studio, write a
   post, hit publish, and we verify it appears on /newsletters. If anything
   is broken, fix it.

2. Seed the givingLevel collection with the 4 levels from /donate
   ($50/$250/$1000/Custom) and confirm the /donate page reads them from
   Sanity instead of hardcoded values.
```

---

## Day 6: Forms + SEO + Performance + Conversion Tracking (~4 hrs)

> **Day Loop:** Forms are pure logic — perfect TDD candidates. Apply `superpowers:test-driven-development` to every route handler (validation, rate limiting, honeypot, Resend dispatch). Form bugs silently lose subscribers. Performance pass at the end uses `superpowers:verification-before-completion` — no claiming Lighthouse 95+ without showing the actual scores.

### Prompt 15 — Contact + Subscribe + form handlers
```
Use the anthropic-skills:backend-architect skill for the route handlers, the
anthropic-skills:frontend-developer skill for the forms, AND the
superpowers:test-driven-development skill — write the route handler tests
FIRST: valid input → 200 + Resend called, invalid input → 400 with field
errors, rate limit exceeded → 429, honeypot tripped → silently 200 (no
Resend), missing required field → 400. Implement minimum to pass.

Build /contact and /subscribe, plus wire up all the form handlers across the
site (contact, subscribe, name-my-boat, clinic-registration).

/contact:
- Form: name, email, subject, message
- Inline zod validation
- Submit → /api/contact (POST) → Resend
- Rate limit: 5 submissions per IP per hour (simple in-memory store, fine for
  this scale)
- Honeypot field for spam (hidden input that real users won't fill)
- On success → /thank-you?from=contact
- On error: inline error message, preserve form input

/subscribe:
- Form: just email + optional name
- Submit → /api/subscribe → Resend (add to a list/audience). Note: Resend's
  Audiences API is the right fit; if not yet set up, store in Sanity as a
  "subscriber" doc with email + dateSubscribed and we'll move to a real ESP
  later
- Same rate limiting + honeypot
- On success → /thank-you?from=subscribe

Also wire the /api/name-my-boat and /api/clinic-registration handlers
similarly. All form submissions trigger a GA4 `form_submitted` custom event
with the form name as a parameter.
```

### Prompt 16 — SEO + dynamic OG images + metadata
```
Use the anthropic-skills:frontend-developer skill.

Add comprehensive SEO:

1. Per-page metadata via Next.js metadata API: unique titles, descriptions,
   Open Graph tags, Twitter cards. Be explicit about each route — don't rely
   on a generic fallback for important pages (/, /about, /donate especially).

2. Dynamic OG image generation using @vercel/og. Three templates:
   - Default (route): name + tagline + sailing photo background
   - Newsletter post: post title + cover image + date
   - Event: event title + date + location
   Generate at runtime via /api/og?route=... — Next.js handles caching.

3. Generate /sitemap.xml and /robots.txt automatically. Sitemap includes
   all static pages + dynamic /newsletters/*, /events/*, /gallery/* routes.

4. JSON-LD structured data:
   - Person schema on / and /about
   - Article schema on /newsletters/[slug]
   - Event schema on /events/[slug]
   - DonateAction schema on /donate

5. Canonical URLs everywhere.
```

### Prompt 17 — Performance + accessibility (Lighthouse 95+)
```
Use the anthropic-skills:frontend-developer skill.

Audit the site rigorously. The bar is Lighthouse 95+, not 90, on Performance,
Accessibility, Best Practices, SEO. Donation conversion is sensitive to LCP
— every 100ms of delay costs ~1% of donations.

Tasks:
- Convert every image to next/image with explicit sizes, priority on
  above-the-fold images (hero), reserved aspect ratios to prevent CLS
- Move heavy third-party scripts (Donorbox, GA4) to use next/script
  (or @next/third-parties for GA4) with optimal strategies (lazyOnload for
  Donorbox where possible)
- Audit font loading: use next/font for self-hosted Google Fonts with
  font-display: swap and proper subset
- Defer framer-motion to client islands; don't import it in server components
- Tree-shake lucide-react (named imports only)
- Run `npm run build && npm run start`, then Lighthouse on /, /about,
  /donate, /newsletters/[a slug] in incognito mobile emulation
- Fix every issue below 95 — show me before/after scores

Accessibility specifically: every interactive element keyboard-navigable,
proper focus rings, alt text on every image (use Sanity image alt fields),
aria-labels on icon-only buttons, color contrast verified for the donate
button against photo backgrounds (use a translucent dark overlay if needed).
```

### Prompt 18 — Donation funnel tracking
```
Use the anthropic-skills:backend-architect skill.

Set up donation funnel tracking in GA4. Custom events to track (use
`gtag('event', name, params)`):

- "donate_cta_click" — fired by every DonateCTA variant (header, inline,
  sidebar, floating). Param: `location: 'header' | 'home_inline_1' |
  'about_final' | etc` so I can see which CTAs convert best.
- "donate_page_viewed" — fired on /donate page view (GA4 auto-tracks
  page views, but fire this as a custom event with `source` param so it
  shows up cleanly in funnel reports).
- "giving_level_selected" — fired when a user clicks one of the $50/$250/
  $1000 cards on /donate. Param: `amount`.
- "donorbox_visible" — intersection observer when the embed enters viewport.
- "subscribe_submitted" — newsletter signup.
- "form_submitted" — generic, with `form: 'contact' | 'name-my-boat' | etc`.

Donorbox itself shows per-donation source attribution natively in its
dashboard — that's already a complete picture for revenue. The GA4 events
add the upstream funnel view (where do people drop off BEFORE the embed
even renders).

Mark `giving_level_selected` and `donate_cta_click` as conversions in the
GA4 admin so they appear in the funnel report under Reports → Engagement →
Conversions.

Skip the Donorbox webhook for now — Donorbox's own dashboard answers the
"did this convert" question. Revisit if/when you want unified attribution
across both tools.
```

---

## Day 7: Content Population + Hero/CTA Polish (~4 hrs)

> **Day Loop:** This Day is mostly content + asset curation, not code logic. Skip TDD; keep brainstorming + planning + verify + review. Use `superpowers:dispatching-parallel-agents` to split: one subagent ports text content per page, another curates and optimizes images. Reconcile in the coordinator.

Now port your real content from the Day 0 backup, and choose the highest-impact assets — particularly the hero photo, which has the largest single influence on donation conversion.

### Prompt 19 — Port real content + curate hero assets
```
Use the anthropic-skills:ui-designer skill for asset curation decisions and
the anthropic-skills:frontend-developer skill for the implementation.

Replace all placeholder text and lorem ipsum across the site with my real
content from ./squarespace-backup/text-content/. For each static page, find
the matching .txt file and integrate the real content thoughtfully — don't
just dump it in, structure it for the component layouts we built:

  - home.txt           → /
  - about.txt          → /about
  - contact.txt        → /contact
  - donate.txt         → /donate
  - press.txt          → /press
  - subscribe.txt      → /subscribe
  - name-my-boat.txt   → /name-my-boat
  - clinic-registration.txt → /clinic-registration
  - thank-you.txt      → /thank-you

(Newsletters and events were imported via Sanity in Day 5 — don't re-import.)

Flag anything in the backup that doesn't have an obvious home on the new site.

ASSET CURATION (this is the most important step for conversion):

1. Browse ./squarespace-backup/all-images/ and shortlist 5-10 candidate
   HERO IMAGES based on these criteria:
   - Action shot, athlete clearly identifiable
   - Dramatic ocean/sky background
   - Composition that leaves space for overlaid text
   - High resolution (≥ 2400px wide)
   - Emotional weight — conveys ambition, movement, focus

   Create a /public/images/hero-candidates/ folder, copy the shortlist there,
   and on the home page render a small hero-picker section ABOVE the real
   hero (with a comment to remove before launch) showing each candidate so
   I can pick the winner. Once picked, replace the hero and delete the
   picker.

2. Curate the ABOUT PORTRAIT — pick 2-3 candidates with strong eye contact
   and athletic but approachable mood. Same picker pattern.

3. Curate the SUPPORTER LOGOS — find Sport Canada, Canadian Sailing Team,
   Oakville Yacht Squadron, Devoti Sailing logos in the backup. If any are
   missing, flag them and I'll source originals.

4. Curate GALLERY COVER IMAGES — one strong shot per sub-gallery.

5. Optimize all selected images: convert to .webp + .avif via sharp,
   serve via next/image. Aim for under 200KB at hero size.
```

Manual checklist for things only you can do:
- [ ] Real career timeline milestones for /about (dates and events)
- [ ] Update Olympic-cycle copy (existing site mentions Paris 2024 — likely now LA 2028 framing)
- [ ] Real giving-level outcomes from your actual training budget (replace placeholders with truth)
- [ ] Real sponsor relationships — confirm logo usage rights for each
- [ ] Social media URLs in the footer
- [ ] Verify Sanity-imported newsletters and events look right; fix any conversion artifacts
- [ ] Review every page and fix anything Claude Code got wrong
- [ ] Personal video for /donate or /about — even a 30-second phone clip lifts conversion meaningfully (defer to Day 10+ if time-pressed)

---

## Day 8: Deploy to Railway + Pre-Launch Testing (~3 hrs)

> **Day Loop:** Deploy is high-risk + non-reversible mistakes are easy. Apply `superpowers:verification-before-completion` strictly: do not move to DNS cutover until every checklist item is GREEN with evidence (Lighthouse screenshot, donation receipt from test, GA4 DebugView screenshot). If any check fails, use `superpowers:systematic-debugging` — find root cause before patching.

### Prompt 20 — Railway deployment prep
```
Use the anthropic-skills:backend-architect skill.

I'm deploying this Next.js site to Railway. Walk me through:
1. Updating next.config.js to use output: 'standalone' for an optimized
   Railway build
2. Creating a Dockerfile based on the official Next.js standalone example,
   optimized for Railway's build cache
3. Pushing the code to a new GitHub repo
4. Setting up the Railway project: linking the GitHub repo, configuring
   environment variables (NEXT_PUBLIC_SANITY_PROJECT_ID,
   NEXT_PUBLIC_SANITY_DATASET, SANITY_API_READ_TOKEN, SANITY_API_WRITE_TOKEN,
   RESEND_API_KEY, NEXT_PUBLIC_GA_MEASUREMENT_ID), and confirming the
   build/start commands
5. Verifying the deploy works at the railway.app preview URL
6. Configuring the Sanity webhook → /api/revalidate (use the Railway preview
   URL until DNS cuts over)
7. Configuring GA4: create the property, set the measurement ID env var,
   verify events fire in the GA4 DebugView, mark `giving_level_selected`
   and `donate_cta_click` as conversions

Recommend whether to use Railway's GitHub auto-deploy or their CLI for the
first deploy.
```

### Pre-launch checklist (test on the *.up.railway.app preview URL)
- [ ] Every page renders correctly on desktop and mobile
- [ ] **Donorbox embed renders and accepts a test donation** — most important check
- [ ] All four giving level cards on /donate pre-fill the Donorbox amount correctly
- [ ] Donorbox dashboard shows the test donation with correct source attribution
- [ ] Contact form, subscribe form, name-my-boat, clinic-registration all deliver email via Resend
- [ ] /studio loads and a published post appears on /newsletters within 60s (or instantly via webhook)
- [ ] All internal links work; no 404s
- [ ] Sticky Donate button visible on every page including mobile
- [ ] Floating mobile DonateCTA appears after 50% scroll
- [ ] Open Graph preview looks correct on /, /about, /donate, /newsletters/[a slug] (test with [opengraph.xyz](https://opengraph.xyz))
- [ ] Lighthouse scores **95+** across the board on /, /about, /donate (mobile, incognito)
- [ ] No console errors in browser DevTools
- [ ] GA4 DebugView shows custom events firing: `donate_cta_click`, `giving_level_selected`, `donorbox_visible`
- [ ] All images have alt text (axe-core or Lighthouse a11y audit)

---

## Day 9: DNS Cutover (~30 min active, 1–24 hrs propagation)

> Skip the full Day Loop here — DNS is a series of console clicks, not code work. But still apply `superpowers:verification-before-completion` after each step (record actual SSL cert issuance, dnschecker.org propagation evidence) before announcing cutover complete.

1. **In Railway** → your service → Settings → Networking → Custom Domain
   - Add `jamesjuhasz.com` and `www.jamesjuhasz.com`
   - Railway shows a CNAME target (e.g. `your-app.up.railway.app`)

2. **For the apex domain (`jamesjuhasz.com`):**
   - Some registrars don't support CNAME at apex
   - Squarespace's DNS supports CNAME flattening in most cases — check their UI
   - If not, Railway provides an IP for an A record fallback

3. **For www (`www.jamesjuhasz.com`):**
   - Standard CNAME pointing to Railway target

4. **Update DNS at Squarespace:** Domains → DNS Settings → update records to match Railway's instructions

5. **Wait for propagation:** monitor at [dnschecker.org](https://dnschecker.org)

6. **SSL:** Railway auto-issues via Let's Encrypt, usually within minutes of DNS propagation

7. **Verify** `https://jamesjuhasz.com` loads correctly

8. **DO NOT cancel Squarespace yet** — keep it running as a fallback

### If apex CNAME causes problems
The cleanest fix is moving DNS management (not registration) to Cloudflare:
- Free, ~10 minute setup
- Supports CNAME flattening natively
- Keep Squarespace as registrar, use Cloudflare nameservers

---

## Day 16+: Cancel Squarespace

After ~7 days of stable operation:
- [ ] Cancel Squarespace subscription
- [ ] Archive XML export and image backup somewhere safe (Google Drive, external SSD)
- [ ] Update any saved bookmarks or links pointing to Squarespace asset URLs

---

## Day 30+: Conversion Optimization (ongoing)

The site shipping is the start, not the end. The donation conversion rate compounds over time. Block ~2 hours every two weeks for this loop.

### The 2-week loop

1. **Read the funnel.** Open GA4 (Reports → Engagement → Conversions) plus the Donorbox dashboard. Look at the chain `donate_cta_click → donate_page_viewed → donorbox_visible → completed donation (Donorbox)`. Find the biggest drop-off step.

2. **Form a hypothesis.** Example: "/donate has high views but low Donorbox-visible rate" → maybe the embed is below the fold on mobile. Or "good Donorbox-visible but low completion" → maybe the embed is rendering with the wrong default amount.

3. **Run a single change.** Don't change five things at once. One variable per cycle. Examples that historically lift donation rates:
   - Hero headline copy ("Help me get to LA 2028" vs. "I need 6 more months of training to qualify")
   - Hero photo (action shot vs. portrait vs. environmental)
   - Donate button color/contrast
   - Giving-level outcomes (specific dollar amounts to specific outcomes)
   - Adding a 30-second video on /donate
   - Recurring vs. one-time as Donorbox default

4. **Wait for signal.** Two weeks of traffic on a personal site is usually enough to see direction (not statistical certainty). Compare to the prior period.

5. **Keep a CHANGELOG.** A simple `CHANGELOG.md` at the repo root, dated entries, what you changed and what happened. Future-you needs this.

### Prompt 21 — Quarterly conversion audit
```
Use the anthropic-skills:ui-designer skill.

It's been a quarter since we shipped. Audit the site through the lens of
maximizing donations. Walk every page as if you're a first-time visitor
who's been told "this athlete needs help." For each page, list:

- The single strongest conversion element
- The single biggest friction point
- One specific concrete change to test next

Be ruthless. If a page (e.g. /clinic-registration) is hurting conversion
by distracting from the donate path, say so and propose either removing
it from the main nav or simplifying.

Pull data from GA4 (traffic by source, top exit pages, custom event funnel)
and Donorbox (donation conversion rate by source). Bring receipts.
```

---

## Things to Watch Out For

**Donorbox embed quirks** — their script can be picky in React. If the widget doesn't render, invoke `superpowers:systematic-debugging` (NOT trial-and-error). The fix is usually adjusting the next/script `strategy` prop, but verify root cause first — sometimes the issue is React strict mode double-mounting, sometimes it's a CSP header.

**Sanity environment variables** — `.env.local` must be in `.gitignore`. Add the same vars to Railway's environment settings before deploying.

**Railway port binding** — Railway injects `PORT`. Default `next start` reads it automatically. Don't hardcode a port in the start command.

**Domain transfer is optional** — you don't need to move registration away from Squarespace to use Railway. Just update DNS records. You can transfer the registrar later (e.g. to Cloudflare for ~$10/year) once everything is stable.

**ISR on Railway** — works fine for monthly blog posts. No edge caching like Vercel, but for this traffic profile it's irrelevant.

---

## Cost Summary

| Line item | Annual cost |
|---|---|
| Squarespace (current) | $300 |
| Railway incremental cost for this site | $0–48 |
| Sanity | $0 (free tier) |
| Resend | $0 (free tier) |
| Google Analytics 4 + Donorbox built-in analytics | $0 |
| Domain registration (unchanged) | already paid via Squarespace |
| **Total annual cost after migration** | **$0–48** |
| **Annual savings** | **~$252–300** |
