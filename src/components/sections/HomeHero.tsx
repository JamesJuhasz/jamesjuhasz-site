import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { SailNumberMark } from "@/components/brand/SailNumberMark";
import { daysToLA2028 } from "@/lib/countdown";
import { SITE } from "@/lib/site";

export function HomeHero() {
  const daysRemaining = daysToLA2028();

  return (
    <section className="relative isolate min-h-[100svh] flex flex-col overflow-hidden text-paper">
      <HeroParallax src="/images/hero.jpg" priority />
      {/* Full-height legibility wash — ink fades from top through bottom (matches brand cover artboard) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/30 via-ink/30 to-ink/85"
      />

      {/* Top eyebrow + sail number watermark */}
      <Container width="wide" className="pt-24 sm:pt-28">
        <div className="flex items-start justify-between gap-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-red">
            T-{daysRemaining} DAYS · LA 2028 OPENING
          </p>
          <SailNumberMark size="md" align="right" mode="dark" />
        </div>
      </Container>

      {/* Top broadcast strip — moved from bottom for clearer hierarchy */}
      <div className="mt-6 border-y border-paper/15 bg-ink/40 backdrop-blur-sm">
        <Container
          width="wide"
          className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3"
        >
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <Mini k="Class" v={SITE.classLabel} />
            <Mini k="Sail №" v={SITE.sailNumber} />
            <Mini k="Next Goal" v={SITE.campaignLabel} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/60">
            Updated {new Date().toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
          </div>
        </Container>
      </div>

      <Container
        width="wide"
        className="mt-auto pb-section-y-lg pt-section-y"
      >
        <h1
          className="font-display font-bold text-paper max-w-[20ch]"
          style={{
            fontSize: "clamp(3rem, 8vw, 6.5rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
          }}
        >
          Canadian sailor
          <br />
          on the road to LA 2028
          <span className="text-red">.</span>
        </h1>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-6 max-w-3xl">
          <HeroStat label="Sailor" value="James Juhasz" sub="CAN 217718" />
          <HeroStat label="Class" value="ILCA 7" sub="Men's Dinghy" />
          <HeroStat label="Goal" value="LA 2028" sub="Olympic Games" />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button
            href="/donate"
            variant="donate"
            size="lg"
            data-cta-location="home_hero"
          >
            Support the Campaign
          </Button>
          <Button
            href="/newsletters"
            variant="ghost"
            size="lg"
            className="text-paper ring-paper/30 hover:bg-paper/10"
          >
            Read the journey
          </Button>
        </div>
      </Container>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/60">
        {label}
      </div>
      <div className="mt-1.5 font-display text-lg sm:text-xl font-semibold tracking-tight text-paper">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/60">
        {k}
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-paper">
        {v}
      </span>
    </div>
  );
}
