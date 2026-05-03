import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { galleries } from "@/lib/galleries";

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

export default function GalleryIndexPage() {
  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="wide">
          <SectionHeader
            eyebrow="Gallery"
            title="Photos from the road"
            lede="Thirteen sub-galleries — Malta, the Mediterranean circuit, Lake Garda, the junior years. The campaign as it actually looks."
          />
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {galleries.map((g, i) => (
                <Link
                  key={g.slug}
                  href={`/gallery/${g.slug}`}
                  className={`group relative overflow-hidden rounded-2xl ring-1 ring-line/50 hover:shadow-lift transition-all ${layoutSizes[i % layoutSizes.length]}`}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${g.toneHue ?? 210} 45% 28%) 0%, hsl(${g.toneHue ?? 210} 50% 14%) 100%)`,
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-navy/20 to-transparent"
                  />
                  <div className="relative h-full flex flex-col justify-end p-6">
                    <p className="text-eyebrow uppercase tracking-wider text-sand mb-2">
                      {g.dateRange} · {g.photoCount} photos
                    </p>
                    <h3 className="font-serif text-h3 text-foam max-w-prose">
                      {g.title}
                    </h3>
                    {g.context ? (
                      <p className="mt-2 text-body text-foam/80 max-w-prose line-clamp-2">
                        {g.context}
                      </p>
                    ) : null}
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge tone="navy">View</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
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
