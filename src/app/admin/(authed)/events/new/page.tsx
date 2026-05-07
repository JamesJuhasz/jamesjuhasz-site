import { EventForm } from "../EventForm";

export default function NewEventPage() {
  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">Events</p>
      <h1 className="mt-2 mb-8 font-display text-h1 leading-tight">New event</h1>
      <EventForm />
    </div>
  );
}
