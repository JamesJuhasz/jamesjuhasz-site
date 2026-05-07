import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getPostsIndex } from "@/lib/posts";
import { getEventsIndex } from "@/lib/events";
import { getGalleries } from "@/lib/galleries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, priority: 1.0, changeFrequency: "weekly", lastModified: now },
    { url: `${SITE.url}/about`, priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/donate`, priority: 1.0, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/events`, priority: 0.8, changeFrequency: "weekly", lastModified: now },
    { url: `${SITE.url}/gallery`, priority: 0.7, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/newsletters`, priority: 0.8, changeFrequency: "weekly", lastModified: now },
    { url: `${SITE.url}/press`, priority: 0.6, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/contact`, priority: 0.5, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE.url}/subscribe`, priority: 0.5, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE.url}/name-my-boat`, priority: 0.5, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE.url}/clinic-registration`, priority: 0.6, changeFrequency: "monthly", lastModified: now },
  ];

  const [posts, events, galleries] = await Promise.all([
    getPostsIndex(),
    getEventsIndex(),
    getGalleries(),
  ]);

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE.url}/newsletters/${p.slug}`,
    priority: 0.6,
    changeFrequency: "yearly",
    lastModified: new Date(p.publishedAt),
  }));

  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE.url}/events/${e.slug}`,
    priority: 0.6,
    changeFrequency: "monthly",
    lastModified: new Date(e.eventDate),
  }));

  const galleryRoutes: MetadataRoute.Sitemap = galleries.map((g) => ({
    url: `${SITE.url}/gallery/${g.slug}`,
    priority: 0.5,
    changeFrequency: "yearly",
    lastModified: now,
  }));

  return [...staticRoutes, ...postRoutes, ...eventRoutes, ...galleryRoutes];
}
