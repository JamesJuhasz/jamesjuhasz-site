import { MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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

export function UpcomingEventCard({ event }: { event: ConsolidatedEvent }) {
  const start = dateFmt.format(new Date(`${event.startDate}T00:00:00`));
  const end =
    event.endDate && event.endDate !== event.startDate
      ? dateFmt.format(new Date(`${event.endDate}T00:00:00`))
      : null;
  const range = end ? `${start} – ${end}` : start;
  const isPriority =
    event.racePriority && /^(A|priority|priority-?A)/i.test(event.racePriority);

  return (
    <Card className="flex flex-col gap-3 shadow-none">
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
      {event.country ? (
        <p className="text-body text-ink/70 inline-flex items-start gap-1.5">
          <MapPin size={14} className="mt-1 flex-shrink-0 text-ink-3" aria-hidden />
          <span>{event.country}</span>
        </p>
      ) : null}
    </Card>
  );
}
