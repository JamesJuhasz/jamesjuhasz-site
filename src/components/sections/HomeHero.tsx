import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { DonorboxGoalMeter } from "@/components/sections/DonorboxGoalMeter";
import { SailNumberMark } from "@/components/brand/SailNumberMark";
import { daysToLA2028 } from "@/lib/countdown";
import { SITE } from "@/lib/site";

export function HomeHero() {
  const daysRemaining = daysToLA2028();

  return (
    <section className="relative isolate min-h-[100svh] flex flex-col overflow-hidden text-paper">
      {/* Desktop */}
      <div className="hidden sm:block">
        <HeroParallax src="/images/hero-candidates/dsc00156.jpg" priority />
      </div>

      {/* Mobile: single portrait-friendly image */}
      <div className="sm:hidden absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/images/hero-candidates/dsc04465.jpg"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/30 via-ink/30 to-ink/85"
      />

      {/* Top eyebrow + sail number watermark */}
      <Container width="wide" className="pt-20 sm:pt-28">
        <div className="flex items-start justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 min-w-0">
            <div
              className="font-display font-bold text-paper leading-none tracking-tight"
              style={{ fontSize: "clamp(1.25rem, 3vw, 2.25rem)" }}
            >
              T<span className="text-red">−</span>
              {daysRemaining}
            </div>
            <p
              className="font-mono font-bold uppercase tracking-[0.18em] text-red leading-none"
              style={{ fontSize: "clamp(1rem, 2.4vw, 1.875rem)" }}
            >
              Days until
            </p>
            <Image
              src="/images/brand/la28-logo.png"
              alt="LA 2028"
              width={745}
              height={1213}
              className="h-12 sm:h-20 w-auto"
              priority
            />
          </div>
          <div className="flex items-start gap-3 sm:gap-5 flex-shrink-0">
            <a
              href="https://www.instagram.com/james.juhasz/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on Instagram"
              className="hidden sm:flex flex-col items-center gap-1.5 transition-opacity hover:opacity-80 min-h-[44px] justify-center"
            >
              <img
                src="/images/brand/instagram-logo.svg"
                alt=""
                style={{ width: "2.25rem", height: "2.25rem", objectFit: "contain" }}
              />
              <span
                className="font-mono font-bold uppercase text-paper"
                style={{ fontSize: "0.6rem", letterSpacing: "0.22em" }}
              >
                Follow on Instagram
              </span>
            </a>
            <a
              href="https://www.instagram.com/james.juhasz/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on Instagram"
              className="sm:hidden inline-flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-80"
            >
              <img
                src="/images/brand/instagram-logo.svg"
                alt=""
                style={{ width: "1.75rem", height: "1.75rem", objectFit: "contain" }}
              />
            </a>
            <SailNumberMark size="md" align="right" mode="dark" />
          </div>
        </div>
      </Container>

      {/* Top broadcast strip — moved from bottom for clearer hierarchy */}
      <div className="mt-6 border-y border-paper/15 bg-ink/40 backdrop-blur-sm">
        <Container
          width="wide"
          className="flex flex-wrap items-center gap-x-8 gap-y-2 py-3"
        >
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <Mini k="Class" v={SITE.classLabel} />
            <Mini k="Sail №" v={SITE.sailNumber} />
            <Mini k="Next Goal" v={SITE.campaignLabel} />
          </div>
        </Container>
      </div>

      <Container
        width="wide"
        className="mt-auto pb-4 sm:pb-section-y-lg pt-section-y"
      >
        <div className="grid lg:grid-cols-12 gap-10 lg:items-end">
          <div className="lg:col-span-7">
            <h1
              className="font-display font-bold max-w-[14ch]"
              style={{
                fontSize: "clamp(2.5rem, 8vw, 6.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
              }}
            >
              <span className="text-paper">James Juhasz</span>
              <br />
              <span className="text-red">Sailing.</span>
            </h1>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-6 max-w-3xl">
              <HeroStat label="Class" value="ILCA 7" />
              <HeroStat label="Country" value="Canada" />
              <HeroStat label="Goal" value="LA 2028" />
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
          </div>

          <div className="lg:col-span-5 lg:justify-self-end w-full lg:max-w-md">
            <div className="flex flex-col gap-3">
              <p className="text-eyebrow uppercase tracking-wider text-paper/60">
                Season goal
              </p>
              <p className="font-display text-h3 text-paper leading-tight">
                Closing the gap on a $39,000 season.
              </p>
              <DonorboxGoalMeter
                className="mt-1"
                textClassName="text-paper"
                trackClassName="bg-paper/20"
              />
            </div>
          </div>
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
