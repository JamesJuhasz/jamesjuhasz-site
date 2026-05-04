import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Trophy } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DonateCTAInline, DonateCTASidebar } from "@/components/cta/DonateCTA";
import { PortableText } from "@/components/sanity/PortableText";
import { JsonLd } from "@/components/JsonLd";
import { eventJsonLd } from "@/lib/json-ld";
import { getEventBySlug, getEventsIndex } from "@/sanity/fetch";

export const revalidate = 60;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateStaticParams() {
  const events = await getEventsIndex();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.excerpt,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const allEvents = await getEventsIndex();
  const idx = allEvents.findIndex((e) => e.slug === slug);
  const prev = idx > 0 ? allEvents[idx - 1] : null;
  const next =
    idx >= 0 && idx < allEvents.length - 1 ? allEvents[idx + 1] : null;

  const range =
    event.endDate && event.endDate !== event.eventDate
      ? `${dateFmt.format(new Date(event.eventDate))} – ${dateFmt.format(new Date(event.endDate))}`
      : dateFmt.format(new Date(event.eventDate));

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          title: event.title,
          eventDate: event.eventDate,
          endDate: event.endDate,
          location: event.location,
          excerpt: event.excerpt,
          slug: event.slug,
        })}
      />
      {/* Hero */}
      <section className="relative min-h-[55svh] flex items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              event.status === "upcoming"
                ? "linear-gradient(135deg, #F5F2ED 0%, #C8CDD3 100%)"
                : "linear-gradient(135deg, #2A2F36 0%, #0E1116 50%, #0B1E2E 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent"
        />
        <Container width="wide" className="pb-16 pt-section-y">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-paper/85 hover:text-paper mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> All events
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge tone={event.status === "upcoming" ? "navy" : "sand"}>
              {event.status === "upcoming"
                ? "Upcoming"
                : event.status === "recent"
                  ? "Recent"
                  : "Past"}
            </Badge>
            <Badge>{event.category}</Badge>
            {event.resultPosition ? (
              <Badge tone="donate">
                <Trophy size={12} /> {event.resultPosition}
              </Badge>
            ) : null}
          </div>
          <h1 className="font-display text-h1 lg:text-display text-paper max-w-[20ch]">
            {event.title}
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-body text-paper/85">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={16} aria-hidden /> {range}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={16} aria-hidden /> {event.location}
            </span>
          </div>
        </Container>
      </section>

      {/* Body + sidebar */}
      <section className="py-section-y">
        <Container width="wide">
          <div className="grid lg:grid-cols-12 gap-10">
            <article className="lg:col-span-8 prose-area">
              {event.body ? (
                <PortableText value={event.body} />
              ) : (
                <div className="space-y-6 text-body-lg text-ink/80 leading-relaxed">
                  <p className="drop-cap">{event.excerpt}</p>
                  <p>
                    Full diary entry pending. Once Sanity is configured and
                    the import has run, the body lands here as portable text.
                  </p>
                </div>
              )}

              {/* Inline CTA at end of body */}
              <div className="mt-12 rounded-2xl bg-ink text-paper p-8">
                <p className="text-eyebrow uppercase tracking-wider text-red mb-2">
                  Was this useful?
                </p>
                <p className="font-display text-h3 text-paper">
                  {event.status === "upcoming"
                    ? "Help fund the start line."
                    : "Help fund the next one."}
                </p>
                <p className="mt-3 text-body text-paper/80 max-w-prose">
                  Each event runs $500–3,000 in entry fees, travel, and
                  housing alone. Your contribution lands directly on the next
                  scoreboard.
                </p>
                <div className="mt-5">
                  <Button
                    href="/donate"
                    variant="donate"
                    size="md"
                    data-cta-location="event_body_cta"
                  >
                    Support the campaign
                  </Button>
                </div>
              </div>

              {/* Prev / next */}
              <nav className="mt-16 grid sm:grid-cols-2 gap-4 border-t border-mist pt-8">
                {prev ? (
                  <Link
                    href={`/events/${prev.slug}`}
                    className="rounded-2xl ring-1 ring-mist p-5 hover:bg-fog transition-colors"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-1">
                      <ChevronLeft size={12} className="inline" /> Previous
                    </p>
                    <p className="font-display text-h3 text-ink">{prev.title}</p>
                  </Link>
                ) : (
                  <div />
                )}
                {next ? (
                  <Link
                    href={`/events/${next.slug}`}
                    className="rounded-2xl ring-1 ring-mist p-5 hover:bg-fog transition-colors text-right"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-1">
                      Next <ChevronRight size={12} className="inline" />
                    </p>
                    <p className="font-display text-h3 text-ink">{next.title}</p>
                  </Link>
                ) : null}
              </nav>
            </article>

            <aside className="lg:col-span-4">
              <div className="sticky top-24 flex flex-col gap-6">
                <DonateCTASidebar
                  headline="Fueling the campaign"
                  body="Every event is a real scoreboard. Your support is where the next one starts."
                  location="event_sidebar"
                />
                <div className="rounded-2xl ring-1 ring-mist bg-white p-5">
                  <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-2">
                    More events
                  </p>
                  <ul className="flex flex-col gap-3">
                    {allEvents
                      .filter((e) => e.slug !== event.slug)
                      .slice(0, 4)
                      .map((e) => (
                        <li key={e.slug}>
                          <Link
                            href={`/events/${e.slug}`}
                            className="text-body text-ink hover:underline"
                          >
                            {e.title}
                          </Link>
                          <p className="text-caption text-ink-3">
                            {dateFmt.format(new Date(e.eventDate))}
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <DonateCTAInline location="event_inline_final" />
    </>
  );
}
