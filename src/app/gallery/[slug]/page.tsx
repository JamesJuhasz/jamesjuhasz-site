import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { galleries, getGallery } from "@/lib/galleries";

export function generateStaticParams() {
  return galleries.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGallery(slug);
  if (!g) return { title: "Gallery not found" };
  return {
    title: g.title,
    description: g.context,
  };
}

/*
  Sub-gallery placeholder. Day 7 swaps the photo grid in via Sanity assets.
  For Day 3, we render the structure: header, masonry-style placeholder
  grid, related galleries, donate CTA close.
*/

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = getGallery(slug);
  if (!gallery) notFound();

  const placeholderTiles = Array.from({ length: gallery.photoCount > 12 ? 12 : gallery.photoCount });
  const aspects = ["aspect-[4/5]", "aspect-[3/2]", "aspect-square", "aspect-[5/4]"];
  const related = galleries.filter((g) => g.slug !== gallery.slug).slice(0, 4);

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="wide">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-1 text-mist hover:text-navy mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> All galleries
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-eyebrow uppercase tracking-wider text-mist mb-3">
                {gallery.dateRange} · {gallery.photoCount} photos
              </p>
              <h1 className="font-serif text-h1 text-navy max-w-[20ch]">
                {gallery.title}
              </h1>
              {gallery.context ? (
                <p className="mt-4 max-w-prose text-body-lg text-ink/75">
                  {gallery.context}
                </p>
              ) : null}
            </div>
            <Badge tone="sand">Day 7 — full lightbox</Badge>
          </div>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {placeholderTiles.map((_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className={`relative ${aspects[i % aspects.length]} rounded-xl overflow-hidden`}
                  style={{
                    background: `linear-gradient(135deg, hsl(${(gallery.toneHue ?? 210) + ((i * 8) % 30) - 10} 45% ${22 + ((i * 5) % 20)}%) 0%, hsl(${gallery.toneHue ?? 210} 50% 14%) 100%)`,
                  }}
                />
              ))}
            </div>
          </Reveal>
          <p className="mt-6 text-caption text-mist">
            Real photos populate Day 7 (curated subset) and Day 5 + later
            (full Sanity asset library).
          </p>
        </Container>
      </section>

      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="wide">
          <h2 className="font-serif text-h2 text-navy mb-6">More from the campaign</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((g) => (
              <Link
                key={g.slug}
                href={`/gallery/${g.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] ring-1 ring-line/50 hover:shadow-lift transition-all"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, hsl(${g.toneHue ?? 210} 45% 28%) 0%, hsl(${g.toneHue ?? 210} 50% 14%) 100%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-navy/20 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-4">
                  <p className="text-caption uppercase tracking-wider text-sand">
                    {g.dateRange}
                  </p>
                  <h3 className="font-serif text-h3 text-foam">{g.title}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button href="/gallery" variant="secondary">
              All galleries
            </Button>
          </div>
        </Container>
      </section>

      <DonateCTAInline location="gallery_detail_inline" />
    </>
  );
}
