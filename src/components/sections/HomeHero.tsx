import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE } from "@/lib/site";

/*
  Day 2 hero. Photo background lands Day 7 via the asset picker.
  For now, layered navy gradient + subtle SVG wave pattern stands in —
  structurally complete, swap-ready (replace .hero-bg with <Image fill />).
*/

export function HomeHero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
      {/* Background — replace with next/image fill on Day 7 */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 80% at 30% 30%, #1F365A 0%, #0E2240 45%, #061122 100%)",
        }}
      />
      {/* Wave pattern overlay */}
      <svg
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 w-full opacity-25 mix-blend-screen"
        viewBox="0 0 1440 320"
        fill="none"
      >
        <path
          d="M0 220 C 240 180, 480 260, 720 220 S 1200 180, 1440 220 L 1440 320 L 0 320 Z"
          fill="#D8C4A6"
        />
        <path
          d="M0 240 C 240 200, 480 280, 720 240 S 1200 200, 1440 240 L 1440 320 L 0 320 Z"
          fill="#0E2240"
        />
      </svg>
      {/* Bottom legibility gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 -z-10 bg-gradient-to-t from-navy-deep/90 via-navy/40 to-transparent"
        aria-hidden
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
