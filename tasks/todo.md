# Admin dashboard — spec & plan (v2: Sanity-free)

Branch: `admin-dashboard`. Goal: password-gated `/admin` for newsletter publishing, results editing/review, and event editing — Sanity replaced from day one for everything in admin scope.

## Architecture

- **Auth**: single shared password (`ADMIN_PASSWORD`) → signed cookie session (HMAC w/ `ADMIN_SESSION_SECRET`). Middleware guards `/admin/*`. 30-day session.
- **Database**: Postgres on Railway (`DATABASE_URL`). Drizzle ORM + drizzle-kit for migrations. Tables:
  - `events` — id, slug, title, event_date, end_date, location, category, result_position, cover_image_url, body_html, body_json, upcoming, created_at, updated_at
  - `posts` (newsletters) — id, slug, title, excerpt, cover_image_url, body_html, body_json, tags (text[]), published_at, sent_at, broadcast_id, created_at, updated_at
  - `result_overrides` — coachaible_id (PK), position, total_competitors, fleet, external_url, notes, hidden, updated_at
  - `result_review_decisions` — event_id (PK), decision ("approve" | "reject"), overrides (jsonb), decided_at
- **WYSIWYG**: TipTap with StarterKit, Image, Link, Placeholder. Stored as both HTML (for email + SSR) and JSON (for round-tripping in the editor).
- **Images**: hosted locally. Files written to `UPLOADS_DIR` (default `./uploads`, gitignored; on Railway mount a Volume at `/data/uploads` and set `UPLOADS_DIR=/data/uploads`). Served by `app/uploads/[name]/route.ts`. URLs are stable (`/uploads/<file>`) regardless of where bytes live.
- **Subscribers**: Resend Audience is source of truth (`RESEND_AUDIENCE_ID`). `/api/subscribe` updated to also call `resend.contacts.create({ audienceId, email })`.
- **Sending**: Resend Broadcasts. "Send to all" creates+sends a broadcast. "Send test" → `resend.emails.send` to owner only. Unsubscribe handled by Resend's hosted page (List-Unsubscribe header injected automatically).

## Migration from Sanity (one-shot)

Script `scripts/migrate-sanity-to-postgres.ts`:
1. Fetch all `event` docs from Sanity → upsert into `events` table. Convert portable-text body → HTML via `@portabletext/to-html` (existing dep gives us it via the react renderer; or pull `@portabletext/to-html`).
2. Fetch all `post` docs → same treatment for `posts` table.
3. Cover images: keep Sanity CDN URLs in `cover_image_url` (they don't expire and the asset CDN keeps working even after we stop writing).
4. Idempotent — upserts on slug.

After verification: delete Sanity schemas + `/studio` route. Press / supporters / giving levels keep their Sanity schemas (out of admin scope, free tier still fine).

## File layout

### Database
- `drizzle.config.ts` — connection + migrations folder.
- `src/db/schema.ts` — drizzle schema for the 4 tables.
- `src/db/client.ts` — `getDb()` returns drizzle client (cached).
- `drizzle/migrations/0000_init.sql` — generated.
- `scripts/migrate-sanity-to-postgres.ts` — one-shot Sanity → PG.
- `scripts/db-push.ts` — runs `drizzle-kit push` for dev convenience.

### Auth
- `src/lib/admin/session.ts` — sign/verify cookie HMAC.
- `src/middleware.ts` — guard `/admin/:path*`. Unauth → 302 to `/admin/sign-in?next=...`.
- `src/app/admin/sign-in/page.tsx`
- `src/app/api/admin/sign-in/route.ts`
- `src/app/api/admin/sign-out/route.ts`

### Data access
- `src/lib/admin/store/posts.ts` — `listPosts()`, `getPost(slug|id)`, `createPost()`, `updatePost()`, `deletePost()`, `markSent()`.
- `src/lib/admin/store/events.ts` — full CRUD.
- `src/lib/admin/store/results.ts` — `getOverride(coachaibleId)`, `upsertOverride()`, `deleteOverride()`, `listOverrides()`.
- `src/lib/admin/store/review.ts` — `getDecision(eventId)`, `upsertDecision()`, `listDecisions()`.

### Public reads (rewrites)
- `src/lib/posts.ts` — new module replacing `getPosts`/`getPost` Sanity fetches. Used by `/newsletters`, `/newsletters/[slug]`, home featured section.
- `src/lib/events.ts` — new module replacing `getEventsIndex`/`getEvent` Sanity fetches. Used by `/events`, `/events/[slug]`, results merging, home upcoming section.
- `src/lib/results.ts` — replace Sanity calls with `getEventsIndex` from new `events.ts`. Add `result_overrides` merge.

### Image upload
- `src/lib/admin/uploads.ts` — `getUploadsDir()`, sanitize filename, generate id, write file, content-type sniff.
- `src/app/api/admin/upload/route.ts` — POST multipart → save to `UPLOADS_DIR` → return `{ url: "/uploads/<file>" }`.
- `src/app/uploads/[name]/route.ts` — GET stream from `UPLOADS_DIR` with content-type, immutable cache headers.

### Resend
- `src/lib/resend.ts` — `addContact(email, name?)`, `sendTestEmail({ to, subject, html })`, `createAndSendBroadcast({ subject, html, name? })`. Reuses existing key from `email.ts`.
- `src/app/api/subscribe/route.ts` — additionally call `addContact()`.

### Newsletter rendering
- `src/lib/admin/newsletter-html.ts` — render `{ title, bodyHtml, coverImageUrl, unsubscribePlaceholder }` to email-safe HTML (table-based, inline styles, `<head>` with brand colors).

### Admin UI
- `src/app/admin/layout.tsx` — chrome (header, nav, sign-out).
- `src/app/admin/page.tsx` — landing tiles.
- `src/app/admin/newsletters/page.tsx` — list (Draft / Published / Sent).
- `src/app/admin/newsletters/new/page.tsx` and `[id]/page.tsx` — TipTap editor + meta fields.
- `src/app/admin/newsletters/[id]/send/page.tsx` — preview + "Send test to me" + "Send to all subscribers" with confirm.
- `src/app/admin/events/page.tsx` — list + create.
- `src/app/admin/events/new/page.tsx` and `[id]/page.tsx` — full edit form.
- `src/app/admin/results/page.tsx` — table; click to edit override; per-row hidden toggle.
- `src/app/admin/results-review/page.tsx` — review queue (port of existing UI).
- `src/app/admin/subscribers/page.tsx` — read-only list from Resend audience.

### API routes (admin)
- `src/app/api/admin/posts/route.ts` and `[id]/route.ts` and `[id]/send/route.ts`.
- `src/app/api/admin/events/route.ts` and `[id]/route.ts`.
- `src/app/api/admin/results/route.ts`.
- `src/app/api/admin/results-review/route.ts`.
- `src/app/api/admin/subscribers/route.ts`.

### Footer
- `src/components/layout/Footer.tsx` — add "Sign in" link in Connect group → `/admin/sign-in`.

### Cleanup (after migration verified)
- Delete `src/sanity/schemas/event.ts` and `post.ts`. Remove from `src/sanity/schemas/index.ts`.
- Delete `src/app/studio/`.
- Remove `sanity.config.ts` and unused deps (`sanity`, `@sanity/vision`, `@sanity/ui`, `@sanity/icons`, `next-sanity` — keep `@sanity/client` + `@sanity/image-url` for press/supporters reads).
- Update `src/sanity/queries.ts` and `fetch.ts` to drop event/post queries.

## Env vars needed (from you)

```
ADMIN_PASSWORD=<choose a strong password>
ADMIN_SESSION_SECRET=<random 32+ char string>
DATABASE_URL=postgresql://...     # from Railway Postgres plugin
UPLOADS_DIR=/data/uploads          # Railway only; defaults to ./uploads in dev
RESEND_AUDIENCE_ID=<from Resend → Audiences page>
```

`RESEND_API_KEY` and `RESEND_FROM_ADDRESS` already exist.

## Build order (so you can verify in stages)

1. Install deps (drizzle, pg, cloudinary, tiptap suite, portable-text-to-html).
2. DB schema + migrations + client.
3. Auth (middleware, session, sign-in page) — verifiable with just `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`.
4. Footer "Sign in" link.
5. Migration script + run against current Sanity content.
6. Switch read-side (events + newsletters) to Postgres.
7. Admin shell + events CRUD.
8. TipTap editor + newsletter CRUD.
9. Cloudinary upload route.
10. Resend subscribe-on-signup + audience integration.
11. Newsletter send (test + broadcast) flow.
12. Results override + review pages.
13. Subscribers panel.
14. Sanity cleanup (delete schemas, studio, deps).
15. Verification pass + tasks/lessons.md update.

## Verification per stage

- (3) Hit `/admin` unauth → redirect. Sign in → access. Sign out → redirect.
- (5) `select count(*) from events`/`posts` matches Sanity counts.
- (6) `/events` and `/newsletters` render identical to before. Diff screenshots if practical.
- (7–8) Create / edit / delete an event and a newsletter, verify on public pages after revalidation.
- (10) Subscribe form → check Resend audience grew by 1 + owner-notification email arrives.
- (11) "Send test to me" → arrives. "Send to all" → only after first verifying with a tiny test audience (or Resend's test mode).
- (12) Override a result position → reflects on `/results`. Auto-scrape unaffected.
- (14) `npm run build` clean. No Sanity Studio assets in bundle.

---

## Review (2026-05-07)

### Shipped on `admin-dashboard` branch

- **Auth.** `src/proxy.ts` (Next 16 proxy, replaced deprecated middleware) gates `/admin/*` and `/api/admin/*` (sign-in/sign-out exempted). `src/lib/admin/session.ts` has Web Crypto-based HMAC cookie, edge-compatible. Footer "Sign in" link landed under Connect.
- **Database.** Postgres on Railway (`DATABASE_URL`). Drizzle schema (`src/db/schema.ts`) covers `events`, `posts`, `result_overrides`, `result_review_decisions`. Migration tooling: `npm run db:generate`, `npm run db:migrate`. Initial migration applied; 20 newsletter posts migrated from Sanity (`npm run migrate:sanity`).
- **Admin shell.** `/admin` route group `(authed)` with header nav (Dashboard / Newsletters / Events / Results / Review / Subscribers) + sign-out.
- **Newsletters CRUD.** TipTap WYSIWYG with StarterKit + Image + Link + Placeholder. Inline image upload to local store. List → editor → preview/send flow.
- **Image hosting.** Local files via `UPLOADS_DIR` (`./uploads` in dev, mount Railway Volume in prod). Served from `/uploads/[name]/route.ts` with 1-year immutable cache.
- **Send flow.** "Send test to me" → `resend.emails.send` to owner. "Send to all" → `resend.broadcasts.create` + `.send` against `RESEND_AUDIENCE_ID`. Marks `sentAt` + stores broadcast id. Uses email-safe `renderNewsletterEmail()` with absolute URL rewrites and unsubscribe footer.
- **Subscribe → audience.** `/api/subscribe` now also calls `resend.contacts.create({ audienceId, email, firstName })` so signups land in Resend. Owner-notification email retained.
- **Subscribers panel.** Read-only list from Resend audience with active/unsubscribed counts.
- **Events CRUD.** DB-backed admin events merge with World Sailing past events on the public `/events`. Admin UI mirrors newsletter editor.
- **Results overrides.** `/admin/results` lists every result on `/results`; per-row override of position / total / fleet / external URL / hidden flag. `getResults()` applies overrides as the last merge step.
- **Results review.** `/admin/results-review` reuses the existing dev-only review UI behind admin auth. Note: writes to `src/data/*.json` so it's still dev-only for now.
- **Public reads switched.** `/newsletters` and `/newsletters/[slug]` read from Postgres via `src/lib/posts.ts`. `/events` and `/events/[slug]` use new `src/lib/events.ts` that merges admin events + WS past. `prose-newsletter` CSS added for both editor and public detail page.
- **Sanity surface trimmed.** `/studio` route, `sanity.config.ts`, and `event` + `post` schemas removed. Sanity reads still in place for press / supporters / giving levels.

### Verified

- Wrong password → 401; right password → 200 + cookie set; protected routes accessible after sign-in.
- All admin pages return 200; all public pages still return 200 after the cutover.
- Events CRUD works end-to-end (create → update → delete via API smoke test).
- 20 newsletter posts migrated; editor loads their HTML.
- Typecheck clean.

### Outstanding (deferred)

- **Domain verification on Resend.** `jamesjuhasz.com` needs DKIM/SPF records added on the domain DNS before sends will succeed. Code is correct; tested as 502 with `from-not-verified` until then.
- **Subscriber import.** Existing subscribers stored in Resend already; new `/subscribe` form-fills add to that audience. Nothing to migrate.
- **Production-safe results-review writes.** Currently file-based (dev-only). Port to Postgres when needed.
- **Press / supporters / giving levels.** Still in Sanity. Move to admin as a follow-up branch.
- **Custom admin chrome.** Public site header/footer still render around admin pages. Optional cleanup (a parallel root layout for `/admin`).

### Env vars set in `.env.local`

- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` ✓
- `DATABASE_URL` (public proxy) ✓
- `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` (existing) ✓
- `RESEND_AUDIENCE_ID` — **needs to be set** to the audience id from resend.com/audiences for the audience integration to actually persist signups.
- `UPLOADS_DIR` — only needed on Railway (mount Volume).
