import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts, type NewPostRow, type PostRow } from "@/db/schema";

export type PostStatus = "draft" | "published" | "sent";

export function postStatus(p: Pick<PostRow, "publishedAt" | "sentAt">): PostStatus {
  if (p.sentAt) return "sent";
  if (p.publishedAt) return "published";
  return "draft";
}

export async function listPosts(): Promise<PostRow[]> {
  const db = getDb();
  return db
    .select()
    .from(posts)
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));
}

export async function listPublishedPosts(): Promise<PostRow[]> {
  const db = getDb();
  const rows = await db.select().from(posts).orderBy(desc(posts.publishedAt));
  return rows.filter((r) => r.publishedAt !== null);
}

export async function getPostById(id: number): Promise<PostRow | null> {
  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

export async function getPostBySlug(slug: string): Promise<PostRow | null> {
  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return row ?? null;
}

export async function createPost(input: NewPostRow): Promise<PostRow> {
  const db = getDb();
  const [row] = await db.insert(posts).values(input).returning();
  return row;
}

export async function updatePost(
  id: number,
  patch: Partial<NewPostRow>,
): Promise<PostRow | null> {
  const db = getDb();
  const [row] = await db
    .update(posts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();
  return row ?? null;
}

export async function deletePost(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
  return rows.length > 0;
}

export async function markSent(
  id: number,
  args: { sentAt?: Date; broadcastId?: string | null },
): Promise<PostRow | null> {
  return updatePost(id, {
    sentAt: args.sentAt ?? new Date(),
    broadcastId: args.broadcastId ?? null,
  });
}
