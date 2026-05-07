import { Container } from "@/components/ui/Container";
import { StatNumber } from "@/components/ui/StatNumber";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { ResultsFilter } from "@/components/sections/ResultsFilter";
import { deriveResultStats, getResults } from "@/lib/results";

export const revalidate = 60;

export const metadata = {
  title: "Results",
  description:
    "Every regatta result from the LA28 campaign — placement, fleet, and the link to the full scoreboard.",
};

function StatOrDash({
  value,
  label,
  suffix,
}: {
  value: number | null;
  label: string;
  suffix?: string;
}) {
  // Render `—` only when value is unknown (null). A literal `0` is honest data
  // (e.g. "0 podiums" beats fake numbers), so render it as a real stat.
  if (value === null) {
    return (
      <div className="flex flex-col items-start">
        <span className="font-display text-display leading-none tracking-tight text-ink/40">
          —
        </span>
        <span className="mt-2 text-caption uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
    );
  }
  return <StatNumber value={value} label={label} suffix={suffix} />;
}

export default async function ResultsPage() {
  const results = await getResults().catch(() => []);
  const stats = deriveResultStats(results);

  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/img_8434.jpg"
          alt="Tight racing at a mark"
          priority
          amount={0.1}
          objectPosition="50% 70%"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <p className="text-eyebrow uppercase font-medium text-paper/70 mb-3">
            Results
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            Race log
          </h1>
        </Container>
      </section>

      <section className="py-10 bg-fog border-b border-mist">
        <Container width="wide">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pass raw counts (including 0) — `—` is reserved for unknown,
                while a literal `0` is honest data the donor needs to see. */}
            <StatOrDash value={stats.total} label="Regattas raced" />
            <StatOrDash value={stats.podiums} label="Podium finishes" />
            <StatOrDash value={stats.topTens} label="Top-10 finishes" />
            <StatOrDash value={stats.countries} label="Countries" />
          </div>
        </Container>
      </section>

      <section className="pt-8 pb-section-y">
        <Container width="wide">
          <ResultsFilter results={results} />
        </Container>
      </section>

      <DonateCTAInline
        location="results_inline"
        headline="Every result is fueled by your support."
        body="Every start line costs travel, coaching, and gear. Recurring monthly support keeps the campaign moving toward LA28."
        ctaLabel="Fuel the next start"
      />
    </>
  );
}
