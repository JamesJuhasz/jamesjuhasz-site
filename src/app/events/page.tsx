import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { UpcomingEventCard } from "@/components/cards/UpcomingEventCard";
import { EventCard } from "@/components/cards/EventCard";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getEventsIndex } from "@/lib/events";
import {
  consolidateEvents,
  deriveStats,
  eventInstanceKey,
  fetchTrainingStats,
  fetchUpcoming,
  filterDisplayable,
  filterOngoing,
  type ConsolidatedEvent,
} from "@/lib/coachaible";
import { enrichEventsWithImages, type EnrichedEvent } from "@/lib/venue-image";
import { daysToLA2028 } from "@/lib/countdown";
import { getOngoingRegattas, isOngoing } from "@/lib/ongoing";

export const revalidate = 60;

export const metadata = {
  title: "Schedule",
  description:
    "The training calendar — every regatta, training block, and coaching gig coming up on the LA28 campaign.",
};

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

export default async function EventsPage() {
  const today =
    process.env.FAKE_TODAY ?? new Date().toISOString().slice(0, 10);

  const [events, upcomingApi, statsApi, ongoingRegattas] = await Promise.all([
    getEventsIndex().catch(() => []),
    fetchUpcoming(100),
    fetchTrainingStats(365),
    getOngoingRegattas(today).catch(() => []),
  ]);

  const upcomingFromApi = upcomingApi
    ? await enrichEventsWithImages(filterDisplayable(consolidateEvents(upcomingApi.events)))
    : [];

  // Ongoing events live in two sources beyond the upcoming feed (which filters
  // out anything with startDate ≤ today):
  //   1. `getOngoingRegattas()` — races (CoachAible + admin DB + World Sailing scrape)
  //   2. `statsApi.events` — last 365 days of training + race events
  // We need both because (1) carries the rich cover image / location data for
  // races, but skips training; (2) catches ongoing training blocks like Bermuda.
  const ongoingFromStats: ConsolidatedEvent[] = statsApi
    ? filterOngoing(
        filterDisplayable(consolidateEvents(statsApi.events)),
        today,
      )
    : [];

  // Dedup by (title, startDate) — the same trip recurs (e.g. "Training: Bermuda"
  // in May and again in June). A title-only key incorrectly collapses them.
  const upcomingKeys = new Set(upcomingFromApi.map(eventInstanceKey));
  const extraOngoing = ongoingRegattas.filter(
    (r) => !upcomingKeys.has(eventInstanceKey(r)),
  );
  const extraOngoingAsConsolidated: ConsolidatedEvent[] = extraOngoing.map((r) => ({
    id: `ongoing-${r.slug}`,
    title: r.title,
    startDate: r.startDate,
    endDate: r.endDate,
    eventType: "race",
    racePriority: null,
    country: null,
  }));
  const extraOngoingEnriched = extraOngoing.length
    ? await enrichEventsWithImages(extraOngoingAsConsolidated)
    : [];

  // Prefer the pre-resolved cover image from the ongoing source, but rely on
  // the Wikipedia enrichment for city/country — the OngoingRegatta `location`
  // is a full "City, Country" string and would double up the country in the UI.
  const extraOngoingMerged: EnrichedEvent[] = extraOngoingEnriched.map((e, i) => ({
    ...e,
    destinationImageUrl: extraOngoing[i].coverImage?.url ?? e.destinationImageUrl,
  }));

  // Stats-derived ongoing: dedupe against upcoming AND against the regatta
  // source (races already covered with rich cover images).
  const coveredKeys = new Set([
    ...upcomingKeys,
    ...extraOngoingMerged.map(eventInstanceKey),
  ]);
  const statsOngoingFresh = ongoingFromStats.filter(
    (e) => !coveredKeys.has(eventInstanceKey(e)),
  );
  const statsOngoingEnriched = statsOngoingFresh.length
    ? await enrichEventsWithImages(statsOngoingFresh)
    : [];

  // At most one ongoing card is ever surfaced. Order of preference:
  //   1. Races from getOngoingRegattas() — rich cover image + priority data
  //   2. Race/training from statsApi.events — catches training blocks
  //   3. Anything in the upcoming feed that happens to overlap today
  // Within a tier, the most-recently-started event wins.
  const upcomingOngoing = upcomingFromApi.filter((e) =>
    isOngoing({ startDate: e.startDate, endDate: e.endDate }, today),
  );
  const pickByLatestStart = (xs: EnrichedEvent[]): EnrichedEvent | null =>
    xs.length ? [...xs].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] : null;

  const ongoingPick =
    pickByLatestStart(extraOngoingMerged) ??
    pickByLatestStart(statsOngoingEnriched) ??
    pickByLatestStart(upcomingOngoing);

  const ongoingKey = ongoingPick ? eventInstanceKey(ongoingPick) : null;

  const scheduleItems: (EnrichedEvent & { isOngoing: boolean })[] = [
    ...(ongoingPick ? [{ ...ongoingPick, isOngoing: true }] : []),
    ...upcomingFromApi
      .filter((e) => eventInstanceKey(e) !== ongoingKey)
      .map((e) => ({ ...e, isOngoing: false })),
  ].sort((a, b) => {
    if (a.isOngoing !== b.isOngoing) return a.isOngoing ? -1 : 1;
    return a.startDate.localeCompare(b.startDate);
  });

  const upcomingFromSanity = events.filter((e) => e.status === "upcoming");
  const usingSanityFallback =
    !upcomingApi && scheduleItems.length === 0 && upcomingFromSanity.length > 0;

  const stats = statsApi ? deriveStats(statsApi) : null;
  const daysToLA = daysToLA2028();

  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/dsc00156.jpg"
          alt="Boat heading upwind on the racecourse"
          priority
          amount={0.1}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <p className="text-eyebrow uppercase font-medium text-paper/70 mb-3">
            Schedule
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            What&apos;s next
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-paper/85">
            Past results live on the Results page.
          </p>
          <div className="mt-10 flex flex-col items-start gap-3">
            <span className="text-caption uppercase tracking-wider text-paper/70">
              Countdown to LA 2028
            </span>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-display leading-none tracking-tight text-red">
                T-{daysToLA}
              </span>
              <span className="font-display text-h3 leading-none tracking-tight text-paper/85">
                days · LA 2028
              </span>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-8 border-b border-mist">
        <Container width="wide">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
            <h2 className="font-display text-h3 text-ink">The campaign so far</h2>
            <p className="text-caption uppercase tracking-wider text-ink-3">Last 365 days</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatOrDash
              value={stats?.trainingDays ?? null}
              label="Training Days"
            />
            <StatOrDash
              value={stats?.eventsCompleted ?? null}
              label="Events completed"
            />
            <StatOrDash
              value={stats?.kmCycled ?? null}
              label="KM cycled"
            />
            <StatOrDash
              value={stats?.countriesTraveled ?? null}
              label="Countries Visited"
            />
          </div>
        </Container>
      </section>

      {scheduleItems.length ? (
        <section className="py-section-y">
          <Container width="wide">
            <SectionHeader
              eyebrow="Schedule"
              title="On the calendar"
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {scheduleItems.map((e, i) => (
                <Reveal key={e.id} delay={Math.min(i * 0.06, 0.36)}>
                  <UpcomingEventCard
                    event={e}
                    destinationImageUrl={e.destinationImageUrl}
                    city={e.city}
                    venueCountry={e.venueCountry}
                    isOngoing={e.isOngoing}
                  />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : usingSanityFallback ? (
        <section className="py-section-y">
          <Container width="wide">
            <SectionHeader
              eyebrow="Upcoming"
              title="Next on the calendar"
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingFromSanity.map((e, i) => (
                <Reveal key={e.slug} delay={Math.min(i * 0.06, 0.36)}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section className="py-section-y bg-fog border-y border-mist">
        <Container width="wide">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-caption uppercase tracking-wider text-ink-3">
                Race log
              </p>
              <h2 className="mt-2 font-display text-h2 text-ink">
                Looking for past results?
              </h2>
              <p className="mt-2 text-body text-ink/75 max-w-prose">
                Every regatta result — placement, fleet, and a link to the full
                scoreboard — lives on the Results page.
              </p>
            </div>
            <Link
              href="/results"
              className="inline-flex items-center gap-2 rounded-pill bg-ink text-paper px-5 py-3 text-caption font-medium hover:bg-ink-2 transition-colors"
            >
              See all results <ArrowUpRight size={16} />
            </Link>
          </div>
        </Container>
      </section>

      <DonateCTAInline
        location="events_inline"
        headline="Each event is a chance to qualify."
        body="Help me make it to the next start line. Recurring monthly support is the difference between racing prepared and racing tired."
        ctaLabel="Support the next regatta"
      />
    </>
  );
}
