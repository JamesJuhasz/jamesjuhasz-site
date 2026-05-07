import Link from "next/link";
import { listEvents } from "@/lib/admin/store/events";

export const dynamic = "force-dynamic";

export default async function EventsIndex() {
  const rows = await listEvents();
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wider text-ink/50">
            Events
          </p>
          <h1 className="mt-2 font-display text-h1 leading-tight">
            Admin events
          </h1>
          <p className="mt-3 text-body text-ink-3 max-w-prose">
            Admin-managed events. Auto-pulled events (Coachaible training calendar,
            World Sailing past results) still appear on /events alongside these.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider"
        >
          New event
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-body text-ink-3">
          No admin events yet — create one with “New event”.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {rows.map((e) => (
            <li key={e.id} className="grid grid-cols-12 items-center gap-4 py-4">
              <div className="col-span-12 md:col-span-5">
                <Link
                  href={`/admin/events/${e.id}`}
                  className="font-display text-h4 leading-tight hover:underline"
                >
                  {e.title}
                </Link>
                <p className="mt-1 text-caption text-ink-3">
                  {e.location}
                </p>
              </div>
              <div className="col-span-6 md:col-span-2 text-caption uppercase tracking-wider text-ink/60">
                {e.category}
              </div>
              <div className="col-span-6 md:col-span-2 text-caption text-ink/60">
                {e.eventDate}
              </div>
              <div className="col-span-6 md:col-span-2 text-caption uppercase tracking-wider">
                {e.upcoming ? (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-900">
                    upcoming
                  </span>
                ) : (
                  <span className="text-ink-3">past</span>
                )}
              </div>
              <div className="col-span-12 md:col-span-1 text-right text-caption uppercase tracking-wider">
                <Link href={`/admin/events/${e.id}`} className="hover:underline">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
