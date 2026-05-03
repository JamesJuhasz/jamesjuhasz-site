"use client";

import { useMemo, useState } from "react";
import { EventCard } from "@/components/cards/EventCard";
import { type SeedEvent } from "@/lib/seed-data";
import { cn } from "@/lib/cn";

type Filter = "All" | "Regatta" | "Training" | "Coaching";

const filters: Filter[] = ["All", "Regatta", "Training", "Coaching"];

export function EventsFilter({ events }: { events: SeedEvent[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const filtered = useMemo(() => {
    if (filter === "All") return events;
    return events.filter((e) => e.category === filter);
  }, [filter, events]);

  return (
    <>
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
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-12 text-body text-mist text-center">
          No events match this filter yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      )}
    </>
  );
}
