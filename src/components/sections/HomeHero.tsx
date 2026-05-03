import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* Navy tint over photo for brand consistency + text legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-navy-deep/30 mix-blend-multiply"
      />
      {/* Bottom legibility gradient */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 -z-10 bg-gradient-to-t from-navy-deep/90 via-navy/40 to-transparent"
      />

      <Container width="wide" className="pb-section-y-lg pt-section-y">
        <p className="text-eyebrow uppercase tracking-[0.18em] text-sand mb-6">
          Olympic ILCA 7 — LA 2028
        </p>
        <h1 className="font-serif text-display text-foam max-w-[18ch]">
          {SITE.name}
        </h1>
        <p className="mt-6 max-w-prose text-body-lg text-foam/85">
          Chasing Olympic gold from the Great Lakes to the Mediterranean. A
          Canadian Sailing Team athlete in the most-contested single-handed
          class in the world.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button
            href="/donate"
            variant="donate"
            size="lg"
            data-cta-location="home_hero"
          >
            Support the Campaign
          </Button>
          <Button href="/newsletters" variant="ghost" size="lg" className="text-foam ring-foam/30 hover:bg-foam/10">
            Read the journey
          </Button>
        </div>
      </Container>

      <Link
        href="#stakes"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-foam/30 text-foam/80 hover:text-foam hover:ring-foam/60 transition"
        aria-label="Scroll down"
      >
        <ChevronDown size={18} />
      </Link>
    </section>
  );
}
