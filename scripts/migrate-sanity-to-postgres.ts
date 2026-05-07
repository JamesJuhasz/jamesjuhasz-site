/*
  One-shot migration: Sanity -> Postgres.

  Reads all `event` and `post` documents from Sanity, converts portable-text
  bodies to HTML, and upserts into the `events` / `posts` Postgres tables
  (idempotent on slug). Cover image URLs (sanity CDN) are preserved as-is —
  Sanity's asset CDN keeps serving them after we stop writing to Sanity.

  Run: npm run migrate:sanity
  Requires DATABASE_URL + NEXT_PUBLIC_SANITY_PROJECT_ID set in .env.local.
*/

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { toHTML } from "@portabletext/to-html";
import { createClient } from "next-sanity";
import { events, posts } from "@/db/schema";

type SanityImage = {
  asset?: { url?: string };
  alt?: string;
};

type SanityEvent = {
  _id: string;
  slug?: { current?: string } | string;
  title?: string;
  eventDate?: string;
  endDate?: string;
  location?: string;
  category?: string;
  resultPosition?: string;
  coverImage?: SanityImage;
  body?: unknown;
  upcoming?: boolean;
};

type SanityPost = {
  _id: string;
  slug?: { current?: string } | string;
  title?: string;
  publishedAt?: string;
  excerpt?: string;
  coverImage?: SanityImage;
  body?: unknown;
  tags?: string[];
  featured?: boolean;
};

function slugOf(s?: { current?: string } | string): string | null {
  if (!s) return null;
  if (typeof s === "string") return s;
  return s.current ?? null;
}

function bodyToHtml(body: unknown): string | null {
  if (!body) return null;
  try {
    return toHTML(body as never, {
      components: {
        types: {
          image: ({ value }: { value: SanityImage }) => {
            const url = value?.asset?.url ?? "";
            const alt = value?.alt ?? "";
            return url ? `<img src="${url}" alt="${alt}" />` : "";
          },
        },
      },
    });
  } catch (err) {
    console.warn("[migrate] portable-text -> html failed:", err);
    return null;
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const apiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-05-01";

  if (!projectId) {
    console.warn(
      "[migrate] NEXT_PUBLIC_SANITY_PROJECT_ID not set — skipping (nothing to migrate).",
    );
    return;
  }

  const sanity = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: process.env.SANITY_API_READ_TOKEN,
    perspective: "published",
  });

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log("[migrate] fetching events from Sanity…");
  const sEvents = await sanity.fetch<SanityEvent[]>(
    `*[_type == "event" && !(_id in path("drafts.**"))]{
      _id, slug, title, eventDate, endDate, location, category,
      resultPosition, coverImage{ asset->{url}, alt }, body, upcoming
    }`,
  );
  console.log(`[migrate] ${sEvents.length} events`);

  for (const e of sEvents) {
    const slug = slugOf(e.slug);
    if (!slug || !e.title || !e.eventDate || !e.location || !e.category) {
      console.warn(`[migrate] skipping event ${e._id} (missing required field)`);
      continue;
    }
    await db
      .insert(events)
      .values({
        slug,
        title: e.title,
        eventDate: e.eventDate,
        endDate: e.endDate ?? null,
        location: e.location,
        category: e.category,
        resultPosition: e.resultPosition ?? null,
        coverImageUrl: e.coverImage?.asset?.url ?? null,
        coverImageAlt: e.coverImage?.alt ?? null,
        bodyHtml: bodyToHtml(e.body),
        bodyJson: (e.body as object) ?? null,
        upcoming: Boolean(e.upcoming),
      })
      .onConflictDoUpdate({
        target: events.slug,
        set: {
          title: e.title,
          eventDate: e.eventDate,
          endDate: e.endDate ?? null,
          location: e.location,
          category: e.category,
          resultPosition: e.resultPosition ?? null,
          coverImageUrl: e.coverImage?.asset?.url ?? null,
          coverImageAlt: e.coverImage?.alt ?? null,
          bodyHtml: bodyToHtml(e.body),
          bodyJson: (e.body as object) ?? null,
          upcoming: Boolean(e.upcoming),
          updatedAt: new Date(),
        },
      });
  }

  console.log("[migrate] fetching posts from Sanity…");
  const sPosts = await sanity.fetch<SanityPost[]>(
    `*[_type == "post" && !(_id in path("drafts.**"))]{
      _id, slug, title, publishedAt, excerpt,
      coverImage{ asset->{url}, alt }, body, tags, featured
    }`,
  );
  console.log(`[migrate] ${sPosts.length} posts`);

  for (const p of sPosts) {
    const slug = slugOf(p.slug);
    if (!slug || !p.title) {
      console.warn(`[migrate] skipping post ${p._id} (missing slug or title)`);
      continue;
    }
    const publishedAt = p.publishedAt ? new Date(p.publishedAt) : null;
    await db
      .insert(posts)
      .values({
        slug,
        title: p.title,
        excerpt: p.excerpt ?? null,
        coverImageUrl: p.coverImage?.asset?.url ?? null,
        coverImageAlt: p.coverImage?.alt ?? null,
        bodyHtml: bodyToHtml(p.body),
        bodyJson: (p.body as object) ?? null,
        tags: p.tags ?? null,
        featured: Boolean(p.featured),
        publishedAt,
      })
      .onConflictDoUpdate({
        target: posts.slug,
        set: {
          title: p.title,
          excerpt: p.excerpt ?? null,
          coverImageUrl: p.coverImage?.asset?.url ?? null,
          coverImageAlt: p.coverImage?.alt ?? null,
          bodyHtml: bodyToHtml(p.body),
          bodyJson: (p.body as object) ?? null,
          tags: p.tags ?? null,
          featured: Boolean(p.featured),
          publishedAt,
          updatedAt: new Date(),
        },
      });
  }

  const eventCount = await db.execute(sql`select count(*)::int as n from events`);
  const postCount = await db.execute(sql`select count(*)::int as n from posts`);
  console.log(
    `[migrate] done. events in pg: ${(eventCount.rows[0] as { n: number }).n}, posts: ${(postCount.rows[0] as { n: number }).n}`,
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
