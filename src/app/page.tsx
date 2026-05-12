import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { HomeHero } from "@/components/sections/HomeHero";
import { GivingTiers } from "@/components/sections/GivingTiers";
import { PostCard } from "@/components/cards/PostCard";
import { EventCard } from "@/components/cards/EventCard";
import { ResultCard } from "@/components/cards/ResultCard";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import {
  consolidateEvents,
  deriveStats,
  fetchTrainingStats,
  fetchUpcoming,
  filterDisplayable,
} from "@/lib/coachaible";
import { enrichEventsWithImages } from "@/lib/venue-image";
import type { SeedEvent } from "@/lib/seed-data";
import { getPostsIndex } from "@/lib/posts";
import { getEventsIndex } from "@/lib/events";
import { getResults } from "@/lib/results";
import { getOngoingResults } from "@/lib/ongoing";
import { RacingNowSection } from "@/components/sections/RacingNowSection";
import { RacingNowModal } from "@/components/sections/RacingNowModal";
import { getPressMentions } from "@/lib/press";
import { Badge } from "@/components/ui/Badge";
import { SITE } from "@/lib/site";

export const revalidate = 60;

const HOME_BUDGET_COLORS = ["#0E1116", "#2A2F36", "#5A6068", "#C8CDD3"] as const;
const HOME_BUDGET = [
  { label: "Coaching + boat", pct: 35, amt: "~$23,500", desc: "Coach fees, charter & freight" },
  { label: "Regattas + housing", pct: 35, amt: "~$23,500", desc: "Entry fees, accommodation" },
  { label: "Travel", pct: 16, amt: "~$10,700", desc: "Flights, transport to venues" },
  { label: "Equipment + other", pct: 14, amt: "~$9,300", desc: "Sails, gear, admin" },
];

function BudgetDonut() {
  let cumulative = 0;
  const stops = HOME_BUDGET.map((c, i) => {
    const start = cumulative;
    cumulative += c.pct;
    return `${HOME_BUDGET_COLORS[i]} ${start}% ${cumulative}%`;
  }).join(", ");
  return (
    <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
      <div className="rounded-full w-full h-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Budget breakdown" />
      <div className="absolute rounded-full bg-paper inset-0 m-auto" style={{ width: "50%", height: "50%", top: "25%", left: "25%" }} />
    </div>
  );
}

function StatOrDash({
  value,
  label,
  suffix,
}: {
  value: number | null;
  label: string;
  suffix?: string;
}) {
  if (value === null) {
    return (
      <div className="flex flex-col items-start">
        <span className="font-display text-display leading-none tracking-tight text-ink/40">
          —
        </span>
        <span className="mt-2 text-caption uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
    );
  }
  return <StatNumber value={value} label={label} suffix={suffix} />;
}

export const metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.shortDescription,
};

export default async function HomePage() {
  // Resilient: build doesn't fail if Postgres is unavailable. ISR
  // (revalidate=60) refills these as soon as the DB is reachable again.
  const [allPosts, events, statsApi, allPress, upcomingApi, allResults, ongoing] = await Promise.all([
    getPostsIndex().catch(() => []),
    getEventsIndex().catch(() => []),
    fetchTrainingStats(365),
    getPressMentions().catch(() => []),
    fetchUpcoming(10),
    getResults().catch(() => []),
    getOngoingResults().catch(() => []),
  ]);
  const stats = statsApi ? deriveStats(statsApi) : null;
  const recentPosts = allPosts.slice(0, 3);
  const featuredPress = allPress
    .filter((p) => (p as any).featured)
    .slice(0, 3);

  const upcomingFromApi = upcomingApi
    ? await enrichEventsWithImages(
        filterDisplayable(consolidateEvents(upcomingApi.events)),
      )
    : [];
  const nearestUpcoming = upcomingFromApi[0];

  // Coachaible upcoming events have no detail page — link the card to /events.
  const coachaibleNextUp: SeedEvent | null = nearestUpcoming
    ? {
        slug: nearestUpcoming.id,
        title: nearestUpcoming.title,
        eventDate: nearestUpcoming.startDate,
        endDate: nearestUpcoming.endDate,
        location:
          nearestUpcoming.city && (nearestUpcoming.venueCountry ?? nearestUpcoming.country)
            ? `${nearestUpcoming.city}, ${nearestUpcoming.venueCountry ?? nearestUpcoming.country}`
            : (nearestUpcoming.city ?? nearestUpcoming.venueCountry ?? nearestUpcoming.country ?? ""),
        category: nearestUpcoming.eventType === "race" ? "Regatta" : "Training",
        status: "upcoming",
        excerpt: "",
        coverImage: nearestUpcoming.destinationImageUrl
          ? {
              asset: { url: nearestUpcoming.destinationImageUrl },
              alt: nearestUpcoming.title,
            }
          : undefined,
      }
    : null;

  const nextUpEvent =
    coachaibleNextUp ?? events.find((e) => e.status === "upcoming") ?? null;
  const nextUpHref = coachaibleNextUp
    ? "/events"
    : nextUpEvent
      ? `/events/${nextUpEvent.slug}`
      : "/events";

  const mostRecentResult = allResults[0] ?? null;

  return (
    <>
      <HomeHero />

      {/* Modal pops once per session whenever a regatta is in progress.
          Hidden entirely when ongoing is empty. */}
      <RacingNowModal ongoing={ongoing} />

      {/* RACING NOW — full-width red banner above the social proof bar.
          Hidden entirely when no regatta is in progress. */}
      <RacingNowSection ongoing={ongoing} />

      {/* SOCIAL PROOF BAR */}
      <section className="pt-20 pb-10 bg-fog border-y border-mist">
        <Container width="wide">
          <p className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-3">
            Backed by
          </p>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-8 gap-x-12 lg:gap-x-24 mb-11">
            {SITE.supporterGroups.map((group) => (
              <div key={group.label}>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3 mb-3">
                  {group.label}
                </p>
                <ul className="flex items-center gap-x-3 sm:gap-x-5 lg:gap-x-8 w-full">
                  {group.items.map((s) => (
                    <li key={s.name} className="flex-1 min-w-0 flex justify-center">
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 transition hover:opacity-80"
                      >
                        <img
                          src={s.logo}
                          alt={s.name}
                          loading="lazy"
                          className="max-h-7 sm:max-h-9 lg:max-h-12 w-auto max-w-full object-contain"
                        />
                        <span className="font-mono uppercase text-ink-3 text-center leading-tight text-[8px] tracking-[0.12em]">
                          {s.name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CAMPAIGN STATS */}
      <section className="py-10 border-b border-mist">
        <Container width="wide">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
            <h2 className="font-display text-h3 text-ink">The campaign so far</h2>
            <p className="text-caption uppercase tracking-wider text-ink-3">Last 365 days</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatOrDash value={stats?.trainingDays ?? null} label="Training Days" />
            <StatOrDash value={stats?.eventsCompleted ?? null} label="Events completed" />
            <StatOrDash value={stats?.kmCycled ?? null} label="KM cycled" />
            <StatOrDash value={stats?.countriesTraveled ?? null} label="Countries Visited" />
          </div>
        </Container>
      </section>

      {/* THE STAKES */}
      <section id="stakes" className="py-10">
        <Container width="default">
          <div className="grid lg:grid-cols-12 gap-12 lg:items-end">
            <div className="lg:col-span-7">
              <Reveal>
                <SectionHeader
                  eyebrow="Why this matters"
                  title="Most Olympic campaigns don't make it. The ones that do, do it on the back of supporters."
                  lede="A full year on campaign costs $67,000 CAD. National funding covers part — donations and sponsorship close the $39,000 gap. Recurring monthly support is the most useful as it allows me to plan out my entire season."
                />
                <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-mist pt-5">
                  <div>
                    <dt className="font-display text-xl font-bold text-ink leading-none">~$39,000</dt>
                    <dd className="text-caption text-ink-3 mt-1 leading-tight">Annual supporter gap</dd>
                  </div>
                  <div>
                    <dt className="font-display text-xl font-bold text-ink leading-none">4 pillars</dt>
                    <dd className="text-caption text-ink-3 mt-1 leading-tight">Coaching · regattas · travel · equipment</dd>
                  </div>
                  <div>
                    <dt className="font-display text-xl font-bold text-ink leading-none">LA 2028</dt>
                    <dd className="text-caption text-ink-3 mt-1 leading-tight">Olympic Games target</dd>
                  </div>
                </dl>
              </Reveal>
              <div className="mt-6 flex flex-wrap items-center gap-3">
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
                <Card className="flex flex-col gap-5 p-6">
                  <p className="text-eyebrow uppercase tracking-wider text-ink-3">Where your support goes</p>
                  <div className="flex flex-col sm:flex-row gap-5 w-full sm:items-start items-center">
                    <BudgetDonut />
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                      {HOME_BUDGET.map((c, i) => (
                        <div key={c.label} className="flex items-start gap-2">
                          <span aria-hidden className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: HOME_BUDGET_COLORS[i] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-caption text-ink leading-tight">{c.label}</p>
                            <p className="text-[10px] text-ink-3 leading-tight mt-0.5">{c.desc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-caption font-semibold text-ink leading-tight">{c.pct}%</p>
                            <p className="text-[10px] text-ink-3 leading-tight mt-0.5">{c.amt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-caption text-ink-3">$67k CAD/yr — <a href="/donate#where" className="underline">see the full breakdown</a></p>
                </Card>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* NEXT UP + MOST RECENT */}
      {(nextUpEvent || mostRecentResult) ? (
        <section className="py-10">
          <Container width="wide">
            <div className="grid gap-8 md:grid-cols-2 items-stretch">
              {nextUpEvent ? (
                <div className="flex flex-col gap-4">
                  <p className="text-eyebrow uppercase tracking-wider text-ink-3">
                    Next up
                  </p>
                  <Reveal className="flex-1">
                    <EventCard event={nextUpEvent} href={nextUpHref} className="h-full" />
                  </Reveal>
                </div>
              ) : null}
              {mostRecentResult ? (
                <div className="flex flex-col gap-4">
                  <p className="text-eyebrow uppercase tracking-wider text-ink-3">
                    Most recent
                  </p>
                  <Reveal delay={0.1} className="flex-1">
                    <ResultCard result={mostRecentResult} className="h-full" />
                  </Reveal>
                </div>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {/* RECENT JOURNEY */}
      <section className="py-10 bg-fog border-y border-mist">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.08}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* IN THE NEWS */}
      {featuredPress.length > 0 && (
        <section className="py-10">
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredPress.map((p, i) => (
                <Reveal key={p.externalUrl} delay={i * 0.08}>
                  <a
                    href={p.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block h-full"
                  >
                    <Card className="h-full flex flex-col gap-3 p-6 transition hover:shadow-lift">
                      <Badge>{p.publication}</Badge>
                      <h3 className="font-display text-h3 text-ink group-hover:text-ink-2 transition-colors">
                        {p.articleTitle.replace(/\s+-\s+\S.*$/, "").trim()}
                      </h3>
                      {p.excerpt && (
                        <p className="text-body text-ink/70 line-clamp-3">
                          {p.excerpt.replace(/\s+\S+\.\S+$/, "").trim()}
                        </p>
                      )}
                    </Card>
                  </a>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* THE PARTNERSHIP ASK */}
      <section className="py-10">
        <Container width="wide">
          <div className="rounded-3xl bg-ink text-paper shadow-lift overflow-hidden p-8 md:p-12 lg:p-16">
            <div className="max-w-prose">
              <p className="text-eyebrow uppercase tracking-wider text-red mb-4">
                Join the campaign
              </p>
              <h2 className="font-display text-h1 text-paper">
                Pick a tier. Or set your own.
              </h2>
              <p className="mt-4 text-body-lg text-paper/80">
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
        className="!py-10"
      />
    </>
  );
}
