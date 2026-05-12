"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Radio, X } from "lucide-react";
import type { Result } from "@/lib/results";

const DISMISS_KEY = "racing-now-modal-dismissed";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatRange(startDate: string, endDate: string) {
  const start = dateFmt.format(new Date(startDate));
  if (!endDate || endDate === startDate) return start;
  return `${start} – ${dateFmt.format(new Date(endDate))}`;
}

export function RacingNowModal({ ongoing }: { ongoing: Result[] }) {
  // Pick the first (most recent) ongoing regatta to feature in the modal.
  // Multiple concurrent regattas are rare; if it happens, the banner still
  // shows everything.
  const featured = ongoing[0];
  // Render-time gate: skip when nothing to show. Modal opens once per
  // session via sessionStorage so it doesn't re-pester within a visit.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!featured) return;
    // Different dismissal key per regatta so a new regatta re-shows the
    // modal even if the user dismissed the previous one this session.
    const key = `${DISMISS_KEY}:${featured.slug ?? featured.id}`;
    if (sessionStorage.getItem(key) === "1") return;
    setOpen(true);
  }, [featured]);

  if (!featured || !open) return null;

  const dismiss = () => {
    const key = `${DISMISS_KEY}:${featured.slug ?? featured.id}`;
    sessionStorage.setItem(key, "1");
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="racing-now-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-paper shadow-lift overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper/90 ring-1 ring-mist text-ink-3 hover:text-ink hover:bg-paper transition-colors"
        >
          <X size={18} />
        </button>

        {featured.coverImage?.url ? (
          <div className="relative aspect-[16/9] w-full bg-fog">
            <Image
              src={featured.coverImage.url}
              alt={featured.coverImage.alt ?? featured.title}
              fill
              priority
              sizes="(min-width: 768px) 32rem, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="bg-red px-6 py-3 flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-paper animate-pulse"
            aria-hidden
          />
          <span className="font-mono font-bold text-[11px] uppercase tracking-[0.2em] text-paper">
            Racing now
          </span>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4">
          <div>
            <h2
              id="racing-now-modal-title"
              className="font-display text-h2 text-ink"
            >
              {featured.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-3">
              {featured.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} aria-hidden /> {featured.location}
                </span>
              ) : null}
              <span>{formatRange(featured.startDate, featured.endDate)}</span>
              {featured.dayOfRegatta ? (
                <span>
                  · Day {featured.dayOfRegatta.current} of{" "}
                  {featured.dayOfRegatta.total}
                </span>
              ) : null}
            </div>
          </div>

          {featured.position ? (
            <p className="font-display text-h3 text-ink">
              Currently {featured.position}
              {featured.totalCompetitors ? (
                <span className="text-ink-3"> of {featured.totalCompetitors}</span>
              ) : null}
            </p>
          ) : (
            <p className="text-body text-ink-3">
              Position not yet available — race in progress
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption pt-2 border-t border-mist">
            {featured.externalUrl ? (
              <a
                href={featured.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="inline-flex items-center gap-1 text-ink font-medium hover:text-ink-2"
              >
                <Radio size={14} /> Live scoreboard <ArrowUpRight size={14} />
              </a>
            ) : null}
            {featured.noticeBoardUrl ? (
              <a
                href={featured.noticeBoardUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
              >
                Notice board <ArrowUpRight size={14} />
              </a>
            ) : null}
            {featured.slug ? (
              <Link
                href={`/events/${featured.slug}#press`}
                onClick={dismiss}
                className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
              >
                Press recaps →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
