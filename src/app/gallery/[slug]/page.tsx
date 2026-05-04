import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { galleries, getGallery, photosForGallery } from "@/lib/galleries";

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

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = getGallery(slug);
  if (!gallery) notFound();

  const photos = photosForGallery(gallery.slug, 12);
  const aspects = ["aspect-[4/5]", "aspect-[3/2]", "aspect-square", "aspect-[5/4]"];
  const related = galleries.filter((g) => g.slug !== gallery.slug).slice(0, 4);

  return (
    <>
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="wide">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-1 text-ink-3 hover:text-ink mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> All galleries
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-3">
                {gallery.dateRange} · {gallery.photoCount} photos
              </p>
              <h1 className="font-display text-h1 text-ink max-w-[20ch]">
                {gallery.title}
              </h1>
              {gallery.context ? (
                <p className="mt-4 max-w-prose text-body-lg text-ink/75">
                  {gallery.context}
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((src, i) => (
              <Reveal
                key={`${src}-${i}`}
                delay={Math.min(i * 0.04, 0.32)}
                className={`relative ${aspects[i % aspects.length]} rounded-xl overflow-hidden bg-fog`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover hover:scale-[1.03] transition-transform duration-700"
                />
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-caption text-ink-3">
            Showing a curated 12 from a larger archive. Full per-gallery sets land in a later pass.
          </p>
        </Container>
      </section>

      <section className="py-section-y bg-fog border-y border-mist">
        <Container width="wide">
          <h2 className="font-display text-h2 text-ink mb-6">More from the campaign</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((g) => (
              <Link
                key={g.slug}
                href={`/gallery/${g.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] ring-1 ring-mist/50 hover:shadow-lift transition-all"
              >
                <Image
                  src={g.coverImage}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-4">
                  <p className="text-caption uppercase tracking-wider text-red">
                    {g.dateRange}
                  </p>
                  <h3 className="font-display text-h3 text-paper">{g.title}</h3>
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
