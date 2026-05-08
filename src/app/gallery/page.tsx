import { Container } from "@/components/ui/Container";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { GalleryShowcase } from "@/components/gallery/GalleryShowcase";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getGalleries } from "@/lib/galleries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gallery",
  description:
    "Photos from the campaign — Malta, the European circuit, Lake Garda, the junior years.",
};

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
          <GalleryShowcase galleries={galleries} />
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
