import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { UpcomingEventCard } from "@/components/cards/UpcomingEventCard";
import { EventCard } from "@/components/cards/EventCard";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getEventsIndex } from "@/sanity/fetch";
import {
  consolidateEvents,
  deriveStats,
  fetchTrainingStats,
  fetchUpcoming,
  filterDisplayable,
  type ConsolidatedEvent,
} from "@/lib/coachaible";
import { daysToLA2028 } from "@/lib/countdown";

export const revalidate = 60;

export const metadata = {
  title: "Events",
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
  const [events, upcomingApi, statsApi] = await Promise.all([
    getEventsIndex(),
    fetchUpcoming(100),
    fetchTrainingStats(365),
  ]);

  const upcomingFromApi: ConsolidatedEvent[] = upcomingApi
    ? filterDisplayable(consolidateEvents(upcomingApi.events))
    : [];
  const upcomingFromSanity = events.filter((e) => e.status === "upcoming");
  const usingSanityFallback =
    !upcomingApi && upcomingFromSanity.length > 0;

  const stats = statsApi ? deriveStats(statsApi) : null;
  const daysToLA = daysToLA2028();

  return (
    <>
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="wide">
          <SectionHeader
            eyebrow="Events"
            title="What's next"
            lede="Where the campaign goes next. Each event is a chance to score Olympic qualification points. Past results live on the Results page."
          />
          <div className="mt-10 flex flex-col items-start gap-3">
            <span className="text-caption uppercase tracking-wider text-ink-3">
              Countdown to LA 2028
            </span>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-display leading-none tracking-tight text-red">
                T-{daysToLA}
              </span>
              <span className="font-display text-h3 leading-none tracking-tight text-ink/70">
                days · LA 2028
              </span>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-section-y border-b border-mist">
        <Container width="wide">
          <p className="text-caption uppercase tracking-wider text-ink-3">
            Last 365 days
          </p>
          <h2 className="mt-2 font-display text-h2 text-ink">
            The campaign so far
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatOrDash
              value={stats?.daysOnWater ?? null}
              label="Days on water"
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
              label="Countries"
            />
          </div>
        </Container>
      </section>

      {upcomingFromApi.length ? (
        <section className="py-section-y">
          <Container width="wide">
            <SectionHeader
              eyebrow="Upcoming"
              title="Next on the calendar"
              lede="Where the campaign goes next. Each event is a chance to score Olympic qualification points."
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingFromApi.map((e, i) => (
                <Reveal key={e.id} delay={Math.min(i * 0.06, 0.36)}>
                  <UpcomingEventCard event={e} />
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
              lede="Where the campaign goes next. Each event is a chance to score Olympic qualification points."
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
              <p className="mt-2 text-body text-ink/70 max-w-prose">
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
