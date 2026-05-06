import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { CareerTimeline } from "@/components/sections/CareerTimeline";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { DonateCTAInline, DonateCTASidebar } from "@/components/cta/DonateCTA";
import { aboutStats, pressEntries } from "@/lib/seed-data";
import { daysToLA2028 } from "@/lib/countdown";

export const metadata = {
  title: "About",
  description:
    "From a 7-year-old on the Great Lakes to chasing Olympic gold — James Juhasz's path to the LA 2028 Games.",
};

export default function AboutPage() {
  const daysToLA = daysToLA2028();
  const stats = aboutStats.map((s) =>
    s.label === "LA Olympics"
      ? { value: daysToLA, suffix: undefined, label: "Days till LA 2028" }
      : s,
  );
  return (
    <>
      {/* EDITORIAL HERO */}
      <section className="relative isolate min-h-[80svh] flex items-end overflow-hidden">
        <HeroParallax
          src="/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1927-edit-2_(2).jpg"
          priority
          objectPosition="50% 15%"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pb-section-y-lg pt-section-y">
          <p className="text-eyebrow uppercase tracking-[0.18em] text-red mb-6">
            About James
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            From a 7-year-old on the Great Lakes to chasing Olympic gold.
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-paper/85">
            One sport, one boat, one start line in 2028.
          </p>
        </Container>
      </section>

      {/* THE STORY — editorial */}
      <section className="py-section-y-lg">
        <Container width="prose">
          <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-4">
            The story · 6 min read
          </p>
          <h2 className="font-display text-h1 text-ink">James' story</h2>

          {/* ── Chapter 1: The beginning ── */}
          <div className="mt-10 space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p className="drop-cap">
              It all started one summer on my parents&apos; boat. Every weekend we
              were on the lake, my sister and I exploring the shoreline, the
              wind doing more of the steering than we did. By the time I could
              hold a tiller properly, sailing wasn&apos;t a hobby — it was the only
              thing that felt like the right shape.
            </p>
          </div>

          {/* Childhood 3-photo grid */}
          <figure className="my-12">
            <div className="grid grid-cols-3 gap-3">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-fog">
                <Image
                  src="/images/about/childhood-steering-sister.jpg"
                  alt="James and his sister at the helm on Lake Ontario"
                  fill
                  sizes="(min-width: 1024px) 23ch, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-fog">
                <Image
                  src="/images/about/childhood-steering-solo.jpg"
                  alt="Young James steering the family boat"
                  fill
                  sizes="(min-width: 1024px) 23ch, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-fog">
                <Image
                  src="/images/about/childhood-thumbs-up.jpg"
                  alt="Young James on Lake Ontario, thumbs up"
                  fill
                  sizes="(min-width: 1024px) 23ch, 33vw"
                  className="object-cover"
                />
              </div>
            </div>
            <figcaption className="mt-3 text-sm text-ink-3 text-center">
              Lake Ontario — age 6
            </figcaption>
          </figure>

          {/* ── Chapter 2: Junior sailing ── */}
          <h3 className="font-display text-h2 mt-16 text-ink">
            The junior years
          </h3>
          <div className="mt-6 space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              At 7, I started sailing school at Bronte Harbour Yacht Club —
              single-handed dinghies, race starts, capsize drills. By 12, I had
              joined the Bronte Harbour Laser Race Team and was racing proper
              ILCA fleets. Regional regattas, one trip to a North American
              championship that I don&apos;t remember winning anything at — but the
              flight home, sitting next to athletes who&apos;d just made the podium,
              was the moment something locked in. I wanted to be on that side of
              the conversation.
            </p>
          </div>

          {/* Sailing school + laser team 2-photo */}
          <figure className="my-12">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-fog">
                  <Image
                    src="/images/about/junior-sailing-school.jpg"
                    alt="Sailing school at Bronte Harbour YC, age 7"
                    fill
                    sizes="(min-width: 1024px) 33ch, 50vw"
                    className="object-cover object-[50%_30%]"
                  />
                </div>
                <p className="mt-2 text-sm text-ink-3">Sailing school, age 7</p>
              </div>
              <div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-fog">
                  <Image
                    src="/images/about/junior-laser-team.jpg"
                    alt="Bronte Harbour Laser Race Team, age 12"
                    fill
                    sizes="(min-width: 1024px) 33ch, 50vw"
                    className="object-cover object-[50%_30%]"
                  />
                </div>
                <p className="mt-2 text-sm text-ink-3">Laser race team, age 12</p>
              </div>
            </div>
          </figure>

          {/* Ontario team */}
          <div className="space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              At 15, I started racing for the Ontario Sailing Team — my first
              taste of national-level selection, competing in CAN kit against
              sailors from every province. The gap between the lake back home
              and this level was significant, and I was determined to close it.
            </p>
          </div>

          <figure className="my-12">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-fog">
              <Image
                src="/images/about/youth-ontario-team.jpg"
                alt="James racing for the Ontario Sailing Team, age 15"
                fill
                sizes="(min-width: 1024px) 70ch, 100vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
            <figcaption className="mt-3 text-sm text-ink-3">
              Ontario Sailing Team — age 15
            </figcaption>
          </figure>

          {/* ── Chapter 3: Queen's University ── */}
          <h3 className="font-display text-h2 mt-16 text-ink">
            Queen&apos;s and Kingston
          </h3>
          <div className="mt-6 space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              At 18, I enrolled at Queen&apos;s University in Kingston — partly for
              the degree, mostly because Kingston puts you on the water that
              trains Olympic sailors. Sailing for the Gaels while the Great
              Lakes threw everything at us, I kept training year-round and
              started racing internationally in the ILCA 7.
            </p>
          </div>

          <figure className="my-12">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-fog">
              <Image
                src="/images/about/queens-sailing.jpg"
                alt="Racing in Queen's University colours, Kingston"
                fill
                sizes="(min-width: 1024px) 70ch, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 text-sm text-ink-3">
              Queen&apos;s University sailing — Kingston, Ontario
            </figcaption>
          </figure>

          {/* ── Chapter 4: Mediterranean ── */}
          <h3 className="font-display text-h2 mt-16 text-ink">
            The Mediterranean move
          </h3>
          <div className="mt-6 space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              At 21, mid-pandemic, I packed up and moved to Malta. SailCoach
              has the deepest international training group in the ILCA 7, and
              the Mediterranean breeze runs year-round. The first six months
              were brutal — getting beaten by people I&apos;d never heard of, every
              single day, for weeks. That&apos;s the thing nobody tells you about
              sailing at this level: you don&apos;t lose to the equipment, you lose
              to people who&apos;ve sailed 10,000 hours more than you.
            </p>
          </div>

          {/* Malta 2-photo: portrait + racing */}
          <figure className="my-12">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-fog">
                <Image
                  src="/images/about/malta-portrait.jpg"
                  alt="James in Malta — the Mediterranean training base"
                  fill
                  sizes="(min-width: 1024px) 33ch, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-fog">
                <Image
                  src="/images/about/malta-racing.jpg"
                  alt="Racing with the SailCoach international training group, Malta"
                  fill
                  sizes="(min-width: 1024px) 33ch, 50vw"
                  className="object-cover object-[50%_30%]"
                />
              </div>
            </div>
            <figcaption className="mt-3 text-sm text-ink-3 text-center">
              Malta — SailCoach international training group
            </figcaption>
          </figure>

          {/* ── Chapter 5: Canadian squad ── */}
          <div className="space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              The Canadian Sailing Team selection in 2022 was the first moment
              in five years that the campaign felt sustainable — full coaching
              support, performance science, a real path to the start line at LA
              2028.
            </p>
          </div>

          <figure className="my-12">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-fog">
              <Image
                src="/images/section/01.jpg"
                alt="James racing for the Canadian Sailing Team — ILCA 7"
                fill
                sizes="(min-width: 1024px) 70ch, 100vw"
                className="object-cover"
              />
            </div>
          </figure>

          <h3 className="font-display text-h2 mt-16 text-ink">
            Recent times
          </h3>

          <div className="mt-6 space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              Now midway through the Olympic Quad, all focus is on LA 2028.
              I&apos;ve based my winters in Malta, where the conditions and
              consistency allow for the volume of on-water work, and I train
              alongside an international squad of Olympic and aspiring Olympic
              sailors. The program blends long sessions on the water, hundreds
              of hours of cycling to build my aerobic engine, and plenty of gym
              work to strengthen my core.
            </p>
          </div>

          <figure className="my-12">
            <div className="relative aspect-[3/4] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-fog">
              <Image
                src="/images/section/06.jpg"
                alt="Racing alongside the international squad in the Mediterranean"
                fill
                sizes="(min-width: 1024px) 70ch, 100vw"
                className="object-cover object-[50%_40%]"
              />
            </div>

          </figure>

          <div className="space-y-6 text-body-lg text-ink/80 leading-relaxed">
            <p>
              The road to LA28 runs through the World Championships, continental
              qualifiers, and the Canadian Olympic Trials, with final selection
              to be completed in the spring of 2028. Every regatta on the
              calendar is a checkpoint — sharpening the craft, building the
              engine, and chasing the standard required to make the start line
              in LA.
            </p>
          </div>

          <figure className="my-12">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-fog">
              <Image
                src="/images/section/02.jpg"
                alt="James Juhasz competing at the 2023 US Open Sailing Series, Long Beach"
                fill
                sizes="(min-width: 1024px) 70ch, 100vw"
                className="object-cover object-[50%_60%]"
              />
            </div>
            <figcaption className="mt-3 text-sm text-ink-3">
              2023 US Open Sailing Series — Long Beach, CA
            </figcaption>
          </figure>
        </Container>
      </section>

      {/* INLINE DONATE CTA — emotional peak, before timeline */}
      <DonateCTAInline
        location="about_emotional_peak"
        headline="If this story resonates, consider joining the campaign."
        body="Recurring monthly support is the most useful thing — it lets me plan a season instead of a regatta."
        ctaLabel="Support James"
      />

      {/* CAREER TIMELINE */}
      <section className="py-section-y-lg bg-fog border-y border-mist">
        <Container width="default">
          <SectionHeader
            eyebrow="Career timeline"
            title="The path so far"
            lede="Major milestones and the inflection points behind them."
          />
          <div className="mt-12">
            <CareerTimeline />
          </div>
        </Container>
      </section>

      {/* STATS STRIP */}
      <section className="py-section-y">
        <Container width="default">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatNumber
                key={s.label}
                value={s.value}
                suffix={s.suffix}
                label={s.label}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* PRESS & RECOGNITION */}
      <section className="py-section-y bg-fog border-y border-mist">
        <Container width="wide">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <SectionHeader
              eyebrow="Press"
              title="In the news"
              lede="Selected coverage of the campaign."
            />
            <Button href="/press" variant="secondary" size="md">
              All press →
            </Button>
          </div>
          <Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {pressEntries.map((p) => (
                <Card key={p.articleTitle} className="flex flex-col gap-2">
                  <Badge>{p.publication}</Badge>
                  <h3 className="font-display text-h3 text-ink">
                    <a
                      href={p.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {p.articleTitle}
                    </a>
                  </h3>
                  {p.excerpt ? (
                    <p className="text-body text-ink/75 line-clamp-3">
                      {p.excerpt}
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* FINAL CTA BAND */}
      <section className="py-section-y-lg">
        <Container width="default">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <h2 className="font-display text-h1 text-ink">
                Help me get to LA 2028.
              </h2>
              <p className="mt-4 max-w-prose text-body-lg text-ink/80">
                Three years out. The campaign runs on supporters. Pick a tier,
                or set your own — every contribution is the next day on the
                water.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/donate" variant="donate" size="lg" data-cta-location="about_final">
                  Support James
                </Button>
                <Button href="/subscribe" variant="ghost" size="lg">
                  Get updates
                </Button>
              </div>
            </div>
            <div>
              <DonateCTASidebar location="about_sidebar_final" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
