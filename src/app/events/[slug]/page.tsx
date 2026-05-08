import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Calendar, Trophy } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DonateCTAInline, DonateCTASidebar } from "@/components/cta/DonateCTA";
import { JsonLd } from "@/components/JsonLd";
import { eventJsonLd } from "@/lib/json-ld";
import { getEventBySlug, getEventsIndex } from "@/lib/events";
import { proxyImagesInHtml } from "@/lib/img-proxy";
import {
  getWorldSailingEventBySlug,
  getWorldSailingSlugs,
  getWorldSailingAdjacentEvents,
  type WSEventDetail,
} from "@/lib/world-sailing";

export const revalidate = 60;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatRange(start: string, end: string) {
  if (!end || end === start) return dateFmt.format(new Date(start));
  return `${dateFmt.format(new Date(start))} – ${dateFmt.format(new Date(end))}`;
}

export async function generateStaticParams() {
  // Resilient: if the DB is unreachable at build time, fall back to WS
  // slugs only. ISR (revalidate=60) regenerates DB-backed events on demand.
  let dbEventsList: { slug: string }[] = [];
  try {
    dbEventsList = await getEventsIndex();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[events] generateStaticParams skipped DB:", err);
    }
  }
  const wsSlugs = getWorldSailingSlugs();
  const dbSet = new Set(dbEventsList.map((e) => e.slug));
  return [
    ...dbEventsList.map((e) => ({ slug: e.slug })),
    ...wsSlugs.filter((s) => !dbSet.has(s)).map((s) => ({ slug: s })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (event) return { title: event.title, description: event.excerpt };
  const ws = getWorldSailingEventBySlug(slug);
  if (ws) return { title: ws.title, description: ws.diaryExcerpt?.slice(0, 160) };
  return { title: "Event not found" };
}

/* ---------------------------------------------------------------------------
   WorldSailing diary body — renders scraped news excerpts with day headers
   when the content has the "Day N: …" format.
-------------------------------------------------------------------------- */
function WSDiaryBody({ ws }: { ws: WSEventDetail }) {
  const diary = ws.diaryExcerpt;

  // Check for multi-day format: lines starting with "Day N:"
  const isDailyFormat = diary ? /^Day \d+:/m.test(diary) : false;
  const days = isDailyFormat && diary
    ? diary.split(/\n\n+/).filter(Boolean)
    : null;

  return (
    <div className="space-y-8 text-body-lg text-ink/80 leading-relaxed">
      {/* Cover image */}
      {ws.coverImage?.asset.url ? (
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-8">
          <Image
            src={ws.coverImage.asset.url}
            alt={ws.coverImage.alt ?? ws.title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 66vw, 100vw"
          />
        </div>
      ) : null}

      {/* Fleet + result summary */}
      <div className="flex flex-wrap gap-3 pb-6 border-b border-mist">
        {ws.fleet ? (
          <span className="inline-flex items-center gap-1.5 text-caption uppercase tracking-wider text-ink-3">
            <Trophy size={13} aria-hidden /> {ws.fleet}
          </span>
        ) : null}
        {ws.resultPosition ? (
          <span className="font-display text-h3 text-ink">
            Finished {ws.resultPosition}
            {ws.totalCompetitors ? (
              <span className="text-ink-3"> of {ws.totalCompetitors}</span>
            ) : null}
          </span>
        ) : null}
        {ws.externalUrl ? (
          <a
            href={ws.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-caption text-ink-3 hover:text-ink ml-auto"
          >
            Full results <ArrowUpRight size={13} />
          </a>
        ) : null}
      </div>

      {/* Diary content */}
      {diary ? (
        isDailyFormat && days ? (
          <div className="space-y-8">
            {days.map((block, i) => {
              const colonIdx = block.indexOf(":");
              const heading = block.slice(0, colonIdx).trim();
              const body = block.slice(colonIdx + 1).trim();
              return (
                <div key={i}>
                  <h3 className="font-display text-h3 text-ink mb-3">{heading}</h3>
                  <p>{body}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {diary.split(/\n\n+/).filter(Boolean).map((para, i) => (
              <p key={i} className={i === 0 ? "drop-cap" : ""}>{para}</p>
            ))}
          </div>
        )
      ) : (
        <p className="text-ink/50 italic">
          No diary entry found for this event yet. Check back after the next enrichment run.
        </p>
      )}

      {/* Source attribution */}
      {ws.diarySourceUrl && ws.diarySourceName ? (
        <p className="text-caption text-ink-3 border-t border-mist pt-4">
          Sourced from{" "}
          <a
            href={ws.diarySourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            {ws.diarySourceName}
          </a>
          . This is a third-party race report — not a personal diary entry.
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Page
-------------------------------------------------------------------------- */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try Sanity first, fall back to WorldSailing enrichment data.
  const dbEvent = await getEventBySlug(slug);
  // Always look up WS enrichment — used when Sanity event has no hand-written body.
  const wsEvent = getWorldSailingEventBySlug(slug);
  if (!dbEvent && !wsEvent) notFound();

  // Navigation neighbours.
  let prev: { slug: string; title: string } | null = null;
  let next: { slug: string; title: string } | null = null;

  if (wsEvent) {
    // WS events have richer adjacent-event data (all 51 regattas by date).
    ({ prev, next } = getWorldSailingAdjacentEvents(slug));
  } else if (dbEvent) {
    const allEvents = await getEventsIndex();
    const idx = allEvents.findIndex((e) => e.slug === slug);
    prev = idx > 0 ? allEvents[idx - 1] : null;
    next = idx >= 0 && idx < allEvents.length - 1 ? allEvents[idx + 1] : null;
  }

  // Unified display values.
  const title = dbEvent?.title ?? wsEvent!.title;
  const eventDate = dbEvent?.eventDate ?? wsEvent!.eventDate;
  const endDate = dbEvent?.endDate ?? wsEvent!.endDate;
  const location = dbEvent?.location ?? wsEvent!.location ?? "";
  const status = dbEvent?.status ?? "past";
  const category = dbEvent?.category ?? "Regatta";
  const resultPosition = dbEvent?.resultPosition ?? wsEvent?.resultPosition;
  const excerpt = dbEvent?.excerpt ?? wsEvent?.diaryExcerpt?.slice(0, 200);

  return (
    <>
      <JsonLd
        data={eventJsonLd({ title, eventDate, endDate, location, excerpt, slug })}
      />

      {/* Hero */}
      <section className="relative min-h-[32svh] flex items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              status === "upcoming"
                ? "linear-gradient(135deg, #F5F2ED 0%, #C8CDD3 100%)"
                : "linear-gradient(135deg, #2A2F36 0%, #0E1116 50%, #0B1E2E 100%)",
          }}
        />
        {/* Hero cover image from WS enrichment */}
        {wsEvent?.coverImage?.asset.url ? (
          <Image
            src={wsEvent.coverImage.asset.url}
            alt={wsEvent.coverImage.alt ?? title}
            fill
            priority
            className="absolute inset-0 object-cover -z-10 opacity-30"
            sizes="100vw"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent"
        />
        <Container width="wide" className="pb-16 pt-section-y">
          <Link
            href="/results"
            className="inline-flex items-center gap-1 text-paper/85 hover:text-paper mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> {wsEvent ? "All results" : "All events"}
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge tone={status === "upcoming" ? "navy" : "sand"}>
              {status === "upcoming" ? "Upcoming" : status === "recent" ? "Recent" : "Past"}
            </Badge>
            <Badge>{category}</Badge>
            {resultPosition ? (
              <Badge tone="donate">
                <Trophy size={12} /> {resultPosition}
              </Badge>
            ) : null}
          </div>
          <h1 className="font-display text-h1 lg:text-display text-paper max-w-[20ch]">
            {title}
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-body text-paper/85">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={16} aria-hidden /> {formatRange(eventDate, endDate)}
            </span>
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={16} aria-hidden /> {location}
              </span>
            ) : null}
          </div>
        </Container>
      </section>

      {/* Body + sidebar */}
      <section className="py-section-y">
        <Container width="wide">
          <div className="grid lg:grid-cols-12 gap-10">
            <article className="lg:col-span-8 prose-area">

              {/* Content: admin-supplied body wins; fall back to WS enrichment; last resort is the excerpt. */}
              {dbEvent?.bodyHtml ? (
                <div
                  className="prose-newsletter max-w-prose"
                  dangerouslySetInnerHTML={{ __html: proxyImagesInHtml(dbEvent.bodyHtml) }}
                />
              ) : wsEvent ? (
                <WSDiaryBody ws={wsEvent} />
              ) : (
                <div className="space-y-6 text-body-lg text-ink/80 leading-relaxed">
                  <p className="drop-cap">{dbEvent?.excerpt}</p>
                </div>
              )}

              {/* Inline CTA */}
              <div className="mt-12 rounded-2xl bg-ink text-paper p-8">
                <p className="text-eyebrow uppercase tracking-wider text-red mb-2">
                  {wsEvent ? "Race report" : "Was this useful?"}
                </p>
                <p className="font-display text-h3 text-paper">
                  {status === "upcoming" ? "Help fund the start line." : "Help fund the next one."}
                </p>
                <p className="mt-3 text-body text-paper/80 max-w-prose">
                  Each event runs $500–3,000 in entry fees, travel, and housing alone.
                  Your contribution lands directly on the next scoreboard.
                </p>
                <div className="mt-5">
                  <Button href="/donate" variant="donate" size="md" data-cta-location="event_body_cta">
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
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <DonateCTAInline location="event_inline_final" />
    </>
  );
}
