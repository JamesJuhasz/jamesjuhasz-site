import { eq, asc, desc, max } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  galleries,
  galleryPhotos,
  type GalleryRow,
  type GalleryPhotoRow,
  type NewGalleryRow,
} from "@/db/schema";

export type GalleryWithPhotos = GalleryRow & {
  photos: GalleryPhotoRow[];
};

export async function listGalleries(): Promise<GalleryRow[]> {
  const db = getDb();
  return db
    .select()
    .from(galleries)
    .orderBy(asc(galleries.sortOrder), desc(galleries.createdAt));
}

export async function listGalleriesWithCounts(): Promise<
  Array<GalleryRow & { photoCount: number }>
> {
  const rows = await listGalleries();
  if (rows.length === 0) return [];
  const db = getDb();
  const photos = await db.select().from(galleryPhotos);
  const counts = new Map<number, number>();
  for (const p of photos) counts.set(p.galleryId, (counts.get(p.galleryId) ?? 0) + 1);
  return rows.map((g) => ({ ...g, photoCount: counts.get(g.id) ?? 0 }));
}

export async function getGalleryBySlug(
  slug: string,
): Promise<GalleryWithPhotos | null> {
  const db = getDb();
  const [g] = await db
    .select()
    .from(galleries)
    .where(eq(galleries.slug, slug))
    .limit(1);
  if (!g) return null;
  const photos = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.galleryId, g.id))
    .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.id));
  return { ...g, photos };
}

export async function getGalleryById(
  id: number,
): Promise<GalleryWithPhotos | null> {
  const db = getDb();
  const [g] = await db.select().from(galleries).where(eq(galleries.id, id)).limit(1);
  if (!g) return null;
  const photos = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.galleryId, g.id))
    .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.id));
  return { ...g, photos };
}

export async function createGallery(input: NewGalleryRow): Promise<GalleryRow> {
  const db = getDb();
  if (input.sortOrder === undefined || input.sortOrder === 0) {
    const [{ value }] = await db
      .select({ value: max(galleries.sortOrder) })
      .from(galleries);
    input = { ...input, sortOrder: (value ?? 0) + 1 };
  }
  const [row] = await db.insert(galleries).values(input).returning();
  return row;
}

export async function updateGallery(
  id: number,
  patch: Partial<NewGalleryRow>,
): Promise<GalleryRow | null> {
  const db = getDb();
  const [row] = await db
    .update(galleries)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(galleries.id, id))
    .returning();
  return row ?? null;
}

export async function markGalleryAnnounced(
  id: number,
): Promise<GalleryRow | null> {
  const db = getDb();
  const [row] = await db
    .update(galleries)
    .set({ lastAnnouncedAt: new Date(), updatedAt: new Date() })
    .where(eq(galleries.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGallery(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(galleries)
    .where(eq(galleries.id, id))
    .returning({ id: galleries.id });
  return rows.length > 0;
}

export async function setPhotosForGallery(
  galleryId: number,
  photos: Array<{ url: string; alt?: string | null }>,
): Promise<GalleryPhotoRow[]> {
  const db = getDb();
  await db.delete(galleryPhotos).where(eq(galleryPhotos.galleryId, galleryId));
  if (photos.length === 0) return [];
  const rows = photos.map((p, i) => ({
    galleryId,
    url: p.url,
    alt: p.alt ?? null,
    sortOrder: i,
  }));
  return db.insert(galleryPhotos).values(rows).returning();
}

export async function appendPhotos(
  galleryId: number,
  photos: Array<{ url: string; alt?: string | null }>,
): Promise<GalleryPhotoRow[]> {
  if (photos.length === 0) return [];
  const db = getDb();
  const [{ value }] = await db
    .select({ value: max(galleryPhotos.sortOrder) })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.galleryId, galleryId));
  const start = (value ?? -1) + 1;
  const rows = photos.map((p, i) => ({
    galleryId,
    url: p.url,
    alt: p.alt ?? null,
    sortOrder: start + i,
  }));
  return db.insert(galleryPhotos).values(rows).returning();
}
