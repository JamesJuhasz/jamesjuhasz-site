import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { CareerTimeline } from "@/components/sections/CareerTimeline";
import { DonateCTAInline, DonateCTASidebar } from "@/components/cta/DonateCTA";
import { aboutStats, pressEntries } from "@/lib/seed-data";

export const metadata = {
  title: "About",
  description:
    "From a 7-year-old on the Great Lakes to chasing Olympic gold — James Juhasz's path to the LA 2028 Games.",
};

export default function AboutPage() {
  return (
    <>
      {/* EDITORIAL HERO */}
      <section className="relative min-h-[80svh] flex items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 80% at 70% 30%, #1F365A 0%, #0E2240 50%, #061122 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 -z-10 bg-gradient-to-t from-navy-deep/90 via-navy/40 to-transparent"
        />
        <Container width="wide" className="pb-section-y-lg pt-section-y">
          <p className="text-eyebrow uppercase tracking-[0.18em] text-sand mb-6">
            About James
          </p>
          <h1 className="font-serif text-display text-foam max-w-[20ch]">
            From a 7-year-old on the Great Lakes to chasing Olympic gold.
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-foam/85">
            One sport, one boat, one start line in 2028.
          </p>
        </Container>
      </section>

      {/* THE STORY — editorial */}
      <section className="py-section-y-lg">
        <Container width="prose">
          <p className="text-eyebrow uppercase tracking-wider text-mist mb-4">
            The story · 6 min read
          </p>
          <h2 className="font-serif text-h1 text-navy">James' story</h2>

          <div className="mt-10 space-y-6 text-body-lg text-ink/85 leading-relaxed">
            <p className="drop-cap">
              It all started one summer on my parents' boat. Every weekend we
              were on the lake, my sister and I exploring the shoreline, the
              wind doing more of the steering than we did. By the time I could
              hold a tiller properly, sailing wasn't a hobby — it was the only
              thing that felt like the right shape.
            </p>
            <p>
              Junior fleets at the Oakville Yacht Squadron came next. Optimist,
              then ILCA 4. Regional regattas, one trip to a North American
              championship that I don't remember winning anything at — but the
              flight home, sitting next to athletes who'd just made the podium,
              was the moment something locked in. I wanted to be on that side of
              the conversation.
            </p>
          </div>

          <figure className="my-12">
            <div
              className="aspect-[16/10] rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, #1F365A 0%, #0E2240 50%, #061122 100%)",
              }}
              aria-hidden
            />
            <figcaption className="mt-3 text-caption text-mist text-center">
              Junior sailing at OYS — early years on the water. Real photo
              swaps in Day 7.
            </figcaption>
          </figure>

          <h3 className="font-serif text-h2 mt-16 text-navy">
            The Mediterranean move
          </h3>
          <div className="mt-6 space-y-6 text-body-lg text-ink/85 leading-relaxed">
            <p>
              At 21, mid-pandemic, I packed up and moved to Malta. SailCoach has
              the deepest international training group in the ILCA 7, and the
              Mediterranean breeze runs year-round. The first six months were
              brutal — getting beaten by people I'd never heard of, every single
              day, for weeks. That's the thing nobody tells you about sailing at
              this level: you don't lose to the equipment, you lose to people
              who've sailed 10,000 hours more than you.
            </p>
            <p>
              I now split my time between Europe and home, training twelve
              months a year. The Canadian Sailing Team selection in 2024 was the
              first moment in five years that the campaign felt sustainable —
              full coaching support, performance science, a real path to the
              start line at LA 2028.
            </p>
          </div>
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
      <section className="py-section-y-lg bg-foam-deep border-y border-line">
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
            {aboutStats.map((s) => (
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
      <section className="py-section-y bg-foam-deep border-y border-line">
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
                  <h3 className="font-serif text-h3 text-navy">
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
              <h2 className="font-serif text-h1 text-navy">
                Help me get to LA 2028.
              </h2>
              <p className="mt-4 max-w-prose text-body-lg text-ink/75">
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
