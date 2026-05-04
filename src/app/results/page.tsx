import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
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
  const results = await getResults();
  const stats = deriveResultStats(results);

  return (
    <>
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="wide">
          <SectionHeader
            eyebrow="Results"
            title="Race log"
            lede="Every regatta from the LA28 campaign — placement, fleet, and a link to the full scoreboard. Pulled from CoachAible and enriched nightly from public results pages."
          />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pass raw counts (including 0) — `—` is reserved for unknown,
                while a literal `0` is honest data the donor needs to see. */}
            <StatOrDash value={stats.total} label="Regattas raced" />
            <StatOrDash value={stats.podiums} label="Podium finishes" />
            <StatOrDash value={stats.topTens} label="Top-10 finishes" />
            <StatOrDash value={stats.countries} label="Countries" />
          </div>
        </Container>
      </section>

      <section className="py-section-y">
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
