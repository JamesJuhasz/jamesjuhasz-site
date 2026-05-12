import Link from "next/link";
import { ArrowUpRight, MapPin, Radio } from "lucide-react";
import { Container } from "@/components/ui/Container";
import type { Result } from "@/lib/results";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
});

function formatRange(startDate: string, endDate: string) {
  const start = dateFmt.format(new Date(startDate));
  if (!endDate || endDate === startDate) return start;
  return `${start} – ${dateFmt.format(new Date(endDate))}`;
}

function RacingNowBanner({ r }: { r: Result }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <div className="flex items-center gap-3 lg:flex-shrink-0">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full bg-paper animate-pulse"
          aria-hidden
        />
        <span className="font-mono font-bold text-[11px] uppercase tracking-[0.2em] text-paper">
          Racing now
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-x-4 lg:gap-y-1 lg:flex-wrap">
        <span className="font-display text-h3 text-paper">{r.title}</span>
        {r.location ? (
          <span className="inline-flex items-center gap-1 text-caption text-paper/80">
            <MapPin size={13} aria-hidden /> {r.location}
          </span>
        ) : null}
        <span className="text-caption text-paper/80">
          {formatRange(r.startDate, r.endDate)}
        </span>
        {r.dayOfRegatta ? (
          <span className="text-caption text-paper/80">
            · Day {r.dayOfRegatta.current} of {r.dayOfRegatta.total}
          </span>
        ) : null}
        {r.position ? (
          <span className="text-caption font-medium text-paper">
            · Currently {r.position}
            {r.totalCompetitors ? ` of ${r.totalCompetitors}` : null}
          </span>
        ) : (
          <span className="text-caption text-paper/80">
            · Race in progress
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption lg:flex-shrink-0">
        {r.externalUrl ? (
          <a
            href={r.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-paper font-medium hover:text-paper/80"
          >
            <Radio size={13} /> Live scoreboard <ArrowUpRight size={13} />
          </a>
        ) : null}
        {r.noticeBoardUrl ? (
          <a
            href={r.noticeBoardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-paper/80 hover:text-paper"
          >
            Notice board <ArrowUpRight size={13} />
          </a>
        ) : null}
        {r.slug ? (
          <Link
            href={`/events/${r.slug}#press`}
            className="inline-flex items-center gap-1 text-paper/80 hover:text-paper"
          >
            Press recaps →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function RacingNowSection({ ongoing }: { ongoing: Result[] }) {
  if (ongoing.length === 0) return null;
  return (
    <section className="bg-red text-paper py-4">
      <Container width="wide">
        <div className="flex flex-col gap-5">
          {ongoing.map((r) => (
            <RacingNowBanner key={r.id} r={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}
