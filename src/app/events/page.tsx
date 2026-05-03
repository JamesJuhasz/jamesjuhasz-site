"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { EventCard } from "@/components/cards/EventCard";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { allEvents, type SeedEvent } from "@/lib/seed-data";
import { cn } from "@/lib/cn";

/*
  /events — race + training log. Doubles as a conversion surface;
  donors give to athletes who are visibly active.
  Seed data shows 7 events; full 27 lands on Day 5 via Sanity import.
*/

type Filter = "All" | "Regatta" | "Training" | "Coaching";

const filters: Filter[] = ["All", "Regatta", "Training", "Coaching"];

export default function EventsPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const upcoming = useMemo(
    () => allEvents.filter((e) => e.status === "upcoming"),
    [],
  );
  const past = useMemo(
    () =>
      allEvents
        .filter((e) => e.status !== "upcoming")
        .sort(
          (a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
        ),
    [],
  );

  const filteredPast = useMemo(() => {
    if (filter === "All") return past;
    return past.filter((e) => e.category === filter);
  }, [filter, past]);

  const stats = useMemo(() => {
    const regattas = allEvents.filter((e) => e.category === "Regatta").length;
    const countries = new Set(
      allEvents.map((e) => e.location.split(",").pop()?.trim() ?? ""),
    ).size;
    const trainingDays = allEvents
      .filter((e) => e.category === "Training")
      .reduce((sum, e) => {
        if (!e.endDate) return sum + 1;
        const days = Math.ceil(
          (new Date(e.endDate).getTime() - new Date(e.eventDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);
    return { regattas, countries, trainingDays };
  }, []);

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="wide">
          <SectionHeader
            eyebrow="Events"
            title="The campaign trail"
            lede="Every regatta, training block, and coaching gig — reverse-chronological. The campaign in motion."
          />
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <StatNumber value={stats.regattas} label="Regattas raced" />
            <StatNumber value={stats.countries} label="Countries" />
            <StatNumber value={stats.trainingDays} label="Training days" />
          </div>
        </Container>
      </section>

      {upcoming.length ? (
        <section className="py-section-y">
          <Container width="wide">
            <SectionHeader
              eyebrow="Upcoming"
              title="Next on the calendar"
              lede="Where the campaign goes next. Each event is a chance to score Olympic qualification points."
            />
            <Reveal>
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <EventCard key={e.slug} event={e} />
                ))}
              </div>
            </Reveal>
          </Container>
        </section>
      ) : null}

      <DonateCTAInline
        location="events_inline"
        headline="Each event is a chance to qualify."
        body="Help me make it to the next start line. Recurring monthly support is the difference between racing prepared and racing tired."
        ctaLabel="Support the next regatta"
      />

      <section className="py-section-y">
        <Container width="wide">
          <SectionHeader
            eyebrow="Race log"
            title="Recent + past"
            lede="Filter by type. Click any event for the full diary entry."
          />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-pill px-4 py-2 text-caption font-medium transition-colors ring-1",
                  filter === f
                    ? "bg-navy text-foam ring-navy"
                    : "bg-foam text-navy ring-line hover:bg-foam-deep",
                )}
                aria-pressed={filter === f}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-caption text-mist">
              {filteredPast.length} {filteredPast.length === 1 ? "event" : "events"}
            </span>
          </div>
          {filteredPast.length === 0 ? (
            <p className="mt-12 text-body text-mist text-center">
              No events match this filter yet.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPast.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          )}
        </Container>
      </section>

      <DonateCTAInline location="events_inline_2" />
    </>
  );
}
