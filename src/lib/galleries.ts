/*
  Gallery sub-collections, served from Postgres (admin-editable).
  Photos may live in /public/images/galleries/<slug>/... (legacy, shipped in repo)
  or /uploads/<hash>.<ext> (new, persisted on Railway volume via /api/admin/upload).
*/

import { listGalleries, getGalleryBySlug } from "@/lib/admin/store/galleries";
import { getDb } from "@/db/client";
import { galleryPhotos } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export type Gallery = {
  slug: string;
  title: string;
  dateRange: string;
  context?: string;
  photoCount: number;
  coverImage: string;
  photos: string[];
};

const FALLBACK_COVER = "/images/galleries/spring-2023/photo-01.jpg";

export async function getGalleries(): Promise<Gallery[]> {
  const rows = await listGalleries();
  if (rows.length === 0) return [];
  const db = getDb();
  const allPhotos = await db
    .select()
    .from(galleryPhotos)
    .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.id));
  const byGallery = new Map<number, string[]>();
  for (const p of allPhotos) {
    const list = byGallery.get(p.galleryId) ?? [];
    list.push(p.url);
    byGallery.set(p.galleryId, list);
  }
  return rows.map((g) => {
    const photos = byGallery.get(g.id) ?? [];
    return {
      slug: g.slug,
      title: g.title,
      dateRange: g.dateRange,
      context: g.context ?? undefined,
      photoCount: photos.length,
      coverImage: g.coverImageUrl ?? photos[0] ?? FALLBACK_COVER,
      photos,
    };
  });
}

export async function getGallery(slug: string): Promise<Gallery | null> {
  const g = await getGalleryBySlug(slug);
  if (!g) return null;
  const photos = g.photos.map((p) => p.url);
  return {
    slug: g.slug,
    title: g.title,
    dateRange: g.dateRange,
    context: g.context ?? undefined,
    photoCount: photos.length,
    coverImage: g.coverImageUrl ?? photos[0] ?? FALLBACK_COVER,
    photos,
  };
}

export async function photosForGallery(slug: string): Promise<string[]> {
  const g = await getGalleryBySlug(slug);
  return g ? g.photos.map((p) => p.url) : [];
}
