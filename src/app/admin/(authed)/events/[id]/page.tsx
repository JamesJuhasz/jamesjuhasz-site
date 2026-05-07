import { notFound } from "next/navigation";
import { getEventById } from "@/lib/admin/store/events";
import { EventForm } from "../EventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">Events</p>
      <h1 className="mt-2 mb-8 font-display text-h1 leading-tight">Edit event</h1>
      <EventForm
        initial={{
          id: event.id,
          title: event.title,
          slug: event.slug,
          eventDate: event.eventDate,
          endDate: event.endDate,
          location: event.location,
          category: event.category as "Regatta" | "Training" | "Coaching",
          resultPosition: event.resultPosition,
          coverImageUrl: event.coverImageUrl,
          coverImageAlt: event.coverImageAlt,
          bodyHtml: event.bodyHtml,
          bodyJson: event.bodyJson,
          upcoming: event.upcoming,
        }}
      />
    </div>
  );
}
