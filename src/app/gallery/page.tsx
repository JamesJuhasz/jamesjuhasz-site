import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { Badge } from "@/components/ui/Badge";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getGalleries } from "@/lib/galleries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gallery",
  description:
    "Photos from the campaign — Malta, the European circuit, Lake Garda, the junior years.",
};

/*
  Bento-style varied-card grid. Sub-gallery cards alternate sizes for an
  editorial, curated feel. Real cover images land Day 7 via Sanity.
*/

const layoutSizes = [
  "md:col-span-7 aspect-[16/9]",
  "md:col-span-5 aspect-[4/5]",
  "md:col-span-5 aspect-[4/5]",
  "md:col-span-7 aspect-[16/9]",
  "md:col-span-4 aspect-[4/5]",
  "md:col-span-4 aspect-[4/5]",
  "md:col-span-4 aspect-[4/5]",
  "md:col-span-12 aspect-[16/6]",
  "md:col-span-6 aspect-[3/2]",
  "md:col-span-6 aspect-[3/2]",
  "md:col-span-4 aspect-[4/5]",
  "md:col-span-4 aspect-[4/5]",
  "md:col-span-4 aspect-[4/5]",
];

export default async function GalleryIndexPage() {
  const galleries = await getGalleries();
  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/img_9086.jpg"
          alt="Sailor on the racecourse with CAN sail"
          priority
          amount={0.1}
          objectPosition="50% 45%"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <p className="text-eyebrow uppercase font-medium text-paper/70 mb-3">
            Gallery
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            Photos from the road
          </h1>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {galleries.map((g, i) => (
              <Reveal
                key={g.slug}
                delay={Math.min(i * 0.05, 0.4)}
                className={layoutSizes[i % layoutSizes.length]}
              >
                <Link
                  href={`/gallery/${g.slug}`}
                  className="group relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-mist/50 hover:shadow-lift transition-all block"
                >
                  <Image
                    src={g.coverImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent"
                  />
                  <div className="relative h-full flex flex-col justify-end p-6">
                    <p className="text-eyebrow uppercase tracking-wider text-red mb-2">
                      {g.dateRange} · {g.photoCount} photos
                    </p>
                    <h3 className="font-display text-h3 text-paper max-w-prose">
                      {g.title}
                    </h3>
                    {g.context ? (
                      <p className="mt-2 text-body text-paper/80 max-w-prose line-clamp-2">
                        {g.context}
                      </p>
                    ) : null}
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge tone="navy">View</Badge>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <DonateCTAInline
        location="gallery_inline"
        headline="Help me make more days like these."
        body="Every gallery is a season's worth of training, travel, and races. Recurring monthly support is the most useful kind."
      />
    </>
  );
}
