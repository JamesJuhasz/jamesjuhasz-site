/*
  Public read-side for newsletters. Postgres-backed.

  Returns a shape compatible with the previous Sanity helper return shape
  (slug, title, excerpt, publishedAt, coverImage, tags) plus `bodyHtml` for
  the detail page. Callers can keep their existing JSX with minor adjustments
  on the detail page (rendering bodyHtml instead of portable-text body).
*/

import { and, desc, eq, gt, lt, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts as postsTable } from "@/db/schema";
import type { CoverImage } from "@/lib/seed-data";

export type PublicPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO
  coverImage?: CoverImage;
  tags: string[];
  featured?: boolean;
};

export type PublicPostDetail = PublicPost & {
  bodyHtml: string;
  previous?: { slug: string; title: string };
  next?: { slug: string; title: string };
};

function rowToPublic(r: typeof postsTable.$inferSelect): PublicPost {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? "",
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    coverImage: r.coverImageUrl
      ? { asset: { url: r.coverImageUrl }, alt: r.coverImageAlt ?? undefined }
      : undefined,
    tags: r.tags ?? [],
    featured: r.featured,
  };
}

export async function getPostsIndex(): Promise<PublicPost[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(postsTable)
    .where(isNotNull(postsTable.publishedAt))
    .orderBy(desc(postsTable.publishedAt));
  return rows.map(rowToPublic);
}

export async function getFeaturedPosts(): Promise<PublicPost[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(postsTable)
    .where(
      and(eq(postsTable.featured, true), isNotNull(postsTable.publishedAt)),
    )
    .orderBy(desc(postsTable.publishedAt))
    .limit(3);
  return rows.map(rowToPublic);
}

export async function getPostBySlug(
  slug: string,
): Promise<PublicPostDetail | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slug, slug))
    .limit(1);
  if (!row || !row.publishedAt) return null;

  const [prev] = await db
    .select({ slug: postsTable.slug, title: postsTable.title })
    .from(postsTable)
    .where(
      and(
        isNotNull(postsTable.publishedAt),
        lt(postsTable.publishedAt, row.publishedAt),
      ),
    )
    .orderBy(desc(postsTable.publishedAt))
    .limit(1);

  const [next] = await db
    .select({ slug: postsTable.slug, title: postsTable.title })
    .from(postsTable)
    .where(
      and(
        isNotNull(postsTable.publishedAt),
        gt(postsTable.publishedAt, row.publishedAt),
      ),
    )
    .orderBy(postsTable.publishedAt)
    .limit(1);

  return {
    ...rowToPublic(row),
    bodyHtml: row.bodyHtml ?? "",
    previous: prev,
    next: next,
  };
}
