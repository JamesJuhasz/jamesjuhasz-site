"use client";

import { useMemo, useState } from "react";
import { ResultCard } from "@/components/cards/ResultCard";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import type { Result } from "@/lib/results";

const ALL = "All";

export function ResultsFilter({ results }: { results: Result[] }) {
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.startDate.slice(0, 4));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [results]);

  const tabs = [ALL, ...years];
  const [filter, setFilter] = useState<string>(ALL);

  const filtered = useMemo(() => {
    if (filter === ALL) return results;
    return results.filter((r) => r.startDate.startsWith(filter));
  }, [filter, results]);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-pill px-4 py-2 text-caption font-medium transition-colors ring-1",
              filter === t
                ? "bg-ink text-paper ring-ink"
                : "bg-paper text-ink ring-mist hover:bg-fog",
            )}
            aria-pressed={filter === t}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-caption text-ink-3">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-12 text-body text-ink-3 text-center">
          No results in this window yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i * 0.04, 0.28)}>
              <ResultCard result={r} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
