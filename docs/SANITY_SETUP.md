# Sanity setup runbook

The site already runs without Sanity — every Sanity-backed page falls back to
seed data in `src/lib/seed-data.ts`. Configure Sanity when you want to publish
from a CMS instead of editing code.

## 1. Create the Sanity project

```bash
npx sanity@latest init --project YOUR_PROJECT_NAME --dataset production --visibility private
```

You'll be prompted for:
- A Sanity account (free tier — sanity.io)
- Project ID (auto-generated, copy it down)
- Dataset name (use `production`)
- Whether to use the existing repo (yes — point at the project root)

When asked "Output path", **point it at the project root, not a subdirectory**.
Sanity init will detect `sanity.config.ts` and skip overwriting.

## 2. Get your tokens

In sanity.io → Manage → your project → API → Tokens:

- Create a **read** token (`Viewer` role) → copy as `SANITY_API_READ_TOKEN`
- Create a **write** token (`Editor` role) → copy as `SANITY_API_WRITE_TOKEN`

Generate a webhook secret yourself (any random string):

```bash
openssl rand -hex 32
```

## 3. Configure env

Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-05-01
SANITY_API_READ_TOKEN=skXXXX...
SANITY_API_WRITE_TOKEN=skXXXX...
SANITY_REVALIDATE_SECRET=<your-random-string>
```

Restart the dev server. The site now reads from Sanity (or falls back if
queries return empty).

## 4. Visit /studio

Open http://localhost:3000/studio. Sign in with your Sanity account. The
studio loads the schemas defined in `src/sanity/schemas/`.

Seed a few sample documents:
- Create a **givingLevel** for $50 / $250 / $1000 to drive `/donate`
- Create at least one **supporter** (Sport Canada, Canadian Sailing Team, etc.)

## 5. Bulk import 20 posts + 27 events

Dry run first against a small subset:

```bash
npm run import:dry
```

Inspect the output — you should see post-/event- ids printed without writes.

Once happy:

```bash
npm run import:full
```

Re-runs are safe — documents have deterministic ids (`post-<slug>`,
`event-<slug>`) and use `createOrReplace`.

After import, verify in /studio that posts and events have body content
with images, and visit `/newsletters` and `/events` to confirm rendering.

If portable-text conversion has artifacts (broken pull quotes, missing
images, stripped formatting), fix the source and re-run with `--limit=3`
to test, then run the full import again.

## 6. Configure the revalidation webhook

In sanity.io → Manage → your project → API → Webhooks → Create webhook:

- Name: `Revalidate Next.js`
- URL: `https://your-railway-app.up.railway.app/api/revalidate`
  (or `http://localhost:3000/api/revalidate` while testing locally with a tunnel)
- Trigger on: Create / Update / Delete
- Filter: `_type in ["post","event","pressMention","supporter","givingLevel"]`
- Projection: `{ _type, slug }`
- HTTP method: `POST`
- API version: `2026-05-01`
- HTTP headers: `authorization: Bearer <SANITY_REVALIDATE_SECRET>`

Test by editing a post in /studio — the change should appear on the live
site within seconds (instead of waiting 60s for ISR).

## Troubleshooting

- **Studio says "missing project id"** — env vars not loaded; restart dev server
- **Posts don't appear** — check the `published` perspective; ensure post is published, not draft
- **Webhook not firing** — verify the secret matches in both Sanity webhook config and `SANITY_REVALIDATE_SECRET`
- **Image upload during import fails** — script falls back to remote fetch; confirm `./squarespace-backup/all-images/` is present
