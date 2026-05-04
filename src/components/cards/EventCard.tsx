import Image from "next/image";
import Link from "next/link";
import { MapPin, Trophy, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { SeedEvent } from "@/lib/seed-data";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function EventCard({
  event,
  size = "md",
  imageSrc,
}: {
  event: SeedEvent;
  size?: "md" | "lg";
  imageSrc?: string;
}) {
  const isUpcoming = event.status === "upcoming";
  const isLg = size === "lg";
  const src = imageSrc ?? event.coverImage?.asset?.url;

  function formatRange() {
    const start = dateFmt.format(new Date(event.eventDate));
    if (!event.endDate || event.endDate === event.eventDate) return start;
    const end = dateFmt.format(new Date(event.endDate));
    return `${start} – ${end}`;
  }

  return (
    <Card
      as={Link}
      href={`/events/${event.slug}`}
      className="group flex flex-col gap-4 shadow-none hover:shadow-lift hover:-translate-y-0.5 transition-all"
    >
      <div
        className={`relative ${isLg ? "aspect-[3/2]" : "aspect-[16/10]"} w-full rounded-xl overflow-hidden bg-fog`}
      >
        {src ? (
          <Image
            src={src}
            alt={event.coverImage?.alt ?? ""}
            fill
            sizes={isLg ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute top-3 left-3 z-10">
          <Badge tone={isUpcoming ? "navy" : "sand"}>
            {isUpcoming ? "Upcoming" : event.status === "recent" ? "Recent" : "Past"}
          </Badge>
        </div>
        {event.resultPosition ? (
          <div className="absolute top-3 right-3 z-10">
            <Badge tone="donate">
              <Trophy size={12} /> {event.resultPosition}
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wider text-ink-3">
          {event.category} · {formatRange()}
        </p>
        <h3 className={`font-display ${isLg ? "text-h2" : "text-h3"} text-ink group-hover:text-ink-2 transition-colors`}>
          {event.title}
        </h3>
        <p className="text-body text-ink/70 line-clamp-2 inline-flex items-start gap-1.5">
          <MapPin size={14} className="mt-1 flex-shrink-0 text-ink-3" aria-hidden />
          <span>{event.location}</span>
        </p>
        {isLg ? (
          <p className="text-body text-ink/80 line-clamp-3 mt-2">
            {event.excerpt}
          </p>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1 text-caption text-ink font-medium">
          Read more <ArrowUpRight size={14} />
        </span>
      </div>
    </Card>
  );
}
