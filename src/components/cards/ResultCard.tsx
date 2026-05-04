import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Result } from "@/lib/results";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatRange(startDate: string, endDate: string) {
  const start = dateFmt.format(new Date(startDate));
  if (!endDate || endDate === startDate) return start;
  const end = dateFmt.format(new Date(endDate));
  return `${start} – ${end}`;
}

function googleSearchUrl(title: string) {
  const q = encodeURIComponent(`"James Juhasz" ${title} results`);
  return `https://www.google.com/search?q=${q}`;
}

export function ResultCard({ result }: { result: Result }) {
  const src = result.coverImage?.url;
  const hasResult = Boolean(result.position);
  const hasUrl = Boolean(result.externalUrl);

  return (
    <article className="group flex flex-col gap-4 rounded-2xl bg-white ring-1 ring-mist p-6 hover:shadow-lift hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-fog">
        {src ? (
          <Image
            src={src}
            alt={result.coverImage?.alt ?? ""}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          // Designed empty state: subtle gradient + faded Trophy icon.
          // Reads as an intentional "data card" rather than a broken/missing image.
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fog to-mist">
            <Trophy
              className="text-ink/15"
              size={64}
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
        )}
        {result.country ? (
          <div className="absolute top-3 left-3 z-10">
            <Badge tone="sand">{result.country}</Badge>
          </div>
        ) : null}
        {hasResult ? (
          <div className="absolute top-3 right-3 z-10">
            <Badge tone="donate">
              <Trophy size={12} /> {result.position}
              {result.totalCompetitors ? ` / ${result.totalCompetitors}` : null}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wider text-ink-3">
          Regatta · {formatRange(result.startDate, result.endDate)}
        </p>
        <h3 className="font-display text-h3 text-ink">{result.title}</h3>
        {result.location ? (
          <p className="text-body text-ink/70 inline-flex items-start gap-1.5">
            <MapPin size={14} className="mt-1 flex-shrink-0 text-ink-3" aria-hidden />
            <span>{result.location}</span>
          </p>
        ) : null}

        {hasResult ? (
          <p className="mt-2 font-display text-h4 text-ink">
            {result.position}
            {result.totalCompetitors ? (
              <span className="text-ink-3"> of {result.totalCompetitors}</span>
            ) : null}
            {result.fleet ? (
              <span className="text-ink-3"> · {result.fleet}</span>
            ) : null}
          </p>
        ) : (
          // No placement yet: render an honest "coming" badge instead of
          // looking-broken italic text. Also signals to the donor that the
          // page is current (not abandoned).
          <div className="mt-2">
            <Badge tone="fog">Result coming</Badge>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption">
          {hasUrl ? (
            <a
              href={result.externalUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink font-medium hover:text-ink-2"
            >
              View full results <ArrowUpRight size={14} />
            </a>
          ) : (
            <a
              href={googleSearchUrl(result.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink-3 font-medium hover:text-ink"
            >
              <Search size={14} /> Search results
            </a>
          )}
          {result.slug ? (
            <Link
              href={`/events/${result.slug}`}
              className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"
            >
              Read the diary →
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
