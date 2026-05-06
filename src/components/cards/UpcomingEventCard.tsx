import { MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ConsolidatedEvent } from "@/lib/coachaible";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TYPE_LABEL: Record<ConsolidatedEvent["eventType"], string> = {
  race: "Regatta",
  training: "Training",
  travel: "Travel",
  rest: "Rest",
  other: "Camp",
};

export function UpcomingEventCard({
  event,
  destinationImageUrl,
  city,
  venueCountry,
}: {
  event: ConsolidatedEvent;
  destinationImageUrl?: string | null;
  city?: string | null;
  venueCountry?: string | null;
}) {
  const start = dateFmt.format(new Date(`${event.startDate}T00:00:00`));
  const end =
    event.endDate && event.endDate !== event.startDate
      ? dateFmt.format(new Date(`${event.endDate}T00:00:00`))
      : null;
  const range = end ? `${start} – ${end}` : start;
  const isPriority =
    event.racePriority && /^(A|priority|priority-?A)/i.test(event.racePriority);

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-mist bg-paper shadow-soft transition-shadow duration-200 flex flex-col">
      {/* Image slot — always rendered so all cards share the same height */}
      <div className="h-28 flex-shrink-0 overflow-hidden bg-fog">
        {destinationImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={destinationImageUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge tone="navy">Upcoming</Badge>
          {isPriority ? (
            <Badge tone="donate">
              <Trophy size={12} /> Priority
            </Badge>
          ) : null}
        </div>
        <p className="text-caption uppercase tracking-wider text-ink-3">
          {TYPE_LABEL[event.eventType]} · {range}
        </p>
        <h3 className="font-display text-h3 text-ink">{event.title}</h3>
        {(() => {
          const country = venueCountry ?? event.country;
          const location = city && country ? `${city}, ${country}` : city ?? country;
          return location ? (
            <p className="text-body text-ink/70 inline-flex items-start gap-1.5">
              <MapPin size={14} className="mt-1 flex-shrink-0 text-ink-3" aria-hidden />
              <span>{location}</span>
            </p>
          ) : null;
        })()}
      </div>
    </div>
  );
}
