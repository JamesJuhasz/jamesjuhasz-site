import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { HomeHero } from "@/components/sections/HomeHero";
import { GivingTiers } from "@/components/sections/GivingTiers";
import { PostCard } from "@/components/cards/PostCard";
import { EventCard } from "@/components/cards/EventCard";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import {
  trainingStats,
  recentPosts,
  allEvents,
} from "@/lib/seed-data";
import { SITE } from "@/lib/site";

export const metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.shortDescription,
};

export default function HomePage() {
  const featuredEvent =
    allEvents.find((e) => e.status === "upcoming") ?? allEvents[0];

  return (
    <>
      <HomeHero />

      {/* SOCIAL PROOF BAR */}
      <section className="bg-foam-deep border-y border-line">
        <Container width="wide" className="py-12">
          <p className="text-eyebrow uppercase tracking-wider text-mist mb-6">
            Backed by
          </p>
          <ul className="flex flex-wrap gap-x-10 gap-y-4 mb-12">
            {SITE.supporters.map((s) => (
              <li
                key={s.name}
                className="text-body-lg font-serif text-navy/80"
              >
                {s.name}
              </li>
            ))}
          </ul>
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {trainingStats.map((s) => (
                <StatNumber
                  key={s.label}
                  value={s.value}
                  label={s.label}
                />
              ))}
            </div>
          </Reveal>
          <p className="mt-6 text-caption text-mist max-w-prose">
            Training summary, last 12 months — full-time campaign on the road.
          </p>
        </Container>
      </section>

      {/* THE STAKES */}
      <section id="stakes" className="py-section-y-lg">
        <Container width="default">
          <div className="grid lg:grid-cols-12 gap-12 lg:items-end">
            <div className="lg:col-span-7">
              <Reveal>
                <SectionHeader
                  eyebrow="Why this matters"
                  title="Most Olympic campaigns don't make it. The ones that do, do it on the back of supporters."
                  lede="A full year on the campaign costs around $60,000 CAD. National team funding covers about half. The rest is coaching, regatta entries, travel, and the boat itself — and that's what every donation goes toward."
                />
              </Reveal>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="/donate" variant="donate" size="lg" data-cta-location="home_stakes">
                  Make it possible
                </Button>
                <Button href="/about" variant="ghost" size="lg">
                  Read the story
                </Button>
              </div>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={0.15}>
                <Card tone="navy" className="flex flex-col gap-3">
                  <Badge tone="sand">Anchor</Badge>
                  <StatNumber
                    prefix="$"
                    value={50}
                    label="funds one full day of training in Europe"
                  />
                  <p className="text-body text-foam/80">
                    Coaching time, RIB fuel, launch fees, food on the road —
                    the cost of one race day in a real fleet.
                  </p>
                </Card>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* RECENT JOURNEY */}
      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="wide">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <SectionHeader
              eyebrow="Latest from the road"
              title="The journey, post by post"
              lede="Race recaps, training notes, and the unglamorous parts of the campaign — published as they happen."
            />
            <Button href="/newsletters" variant="secondary" size="md">
              Read all updates
            </Button>
          </div>
          <Reveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* UPCOMING / RECENT EVENT */}
      {featuredEvent ? (
        <section className="py-section-y">
          <Container width="default">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <SectionHeader
                  eyebrow={
                    featuredEvent.status === "upcoming"
                      ? "Next on the calendar"
                      : "Most recent"
                  }
                  title={featuredEvent.title}
                  lede={featuredEvent.excerpt}
                />
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    href={`/events/${featuredEvent.slug}`}
                    variant="primary"
                    size="md"
                  >
                    Event details
                  </Button>
                  <Button
                    href="/donate"
                    variant="donate"
                    size="md"
                    data-cta-location="home_event_cta"
                  >
                    Cheer me on
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <Reveal delay={0.15}>
                  <EventCard
                    event={featuredEvent}
                    size="lg"
                    imageSrc="/images/featured-event.jpg"
                  />
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* THE PARTNERSHIP ASK */}
      <section className="py-section-y-lg">
        <Container width="wide">
          <div className="rounded-3xl bg-navy text-foam shadow-lift overflow-hidden p-8 md:p-12 lg:p-16">
            <div className="max-w-prose">
              <p className="text-eyebrow uppercase tracking-wider text-sand mb-4">
                Join the campaign
              </p>
              <h2 className="font-serif text-h1 text-foam">
                Pick a tier. Or set your own.
              </h2>
              <p className="mt-4 text-body-lg text-foam/80">
                Recurring monthly support is the difference between scrambling
                between regattas and showing up prepared. Anything works — and
                every dollar lands where it should.
              </p>
            </div>
            <div className="mt-10">
              <GivingTiers />
            </div>
          </div>
        </Container>
      </section>

      <DonateCTAInline
        location="home_inline_final"
        headline="Help me get to LA 2028."
        body="Three years out. Still a long way to go. Join the team."
        ctaLabel="Join the team"
      />
    </>
  );
}
