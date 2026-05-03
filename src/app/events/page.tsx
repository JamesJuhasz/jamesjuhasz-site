import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import { Reveal } from "@/components/ui/Reveal";
import { EventCard } from "@/components/cards/EventCard";
import { EventsFilter } from "@/components/sections/EventsFilter";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getEventsIndex } from "@/sanity/fetch";

export const revalidate = 60;

export const metadata = {
  title: "Events",
  description:
    "Race log + training calendar — every regatta, training block, and coaching gig from the LA 2028 campaign.",
};

export default async function EventsPage() {
  const events = await getEventsIndex();
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events
    .filter((e) => e.status !== "upcoming")
    .sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );

  const regattas = events.filter((e) => e.category === "Regatta").length;
  const countries = new Set(
    events.map((e) => e.location.split(",").pop()?.trim() ?? ""),
  ).size;
  const trainingDays = events
    .filter((e) => e.category === "Training")
    .reduce((sum, e) => {
      if (!e.endDate) return sum + 1;
      const days = Math.ceil(
        (new Date(e.endDate).getTime() - new Date(e.eventDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return sum + days;
    }, 0);

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
            <StatNumber value={regattas} label="Regattas raced" />
            <StatNumber value={countries} label="Countries" />
            <StatNumber value={trainingDays} label="Training days" />
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
          <EventsFilter events={past} />
        </Container>
      </section>

      <DonateCTAInline location="events_inline_2" />
    </>
  );
}
