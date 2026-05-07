import { getResults } from "@/lib/results";
import { listOverrides } from "@/lib/admin/store/results";
import { ResultsTable } from "./ResultsTable";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const [results, overrides] = await Promise.all([
    getResults(),
    listOverrides(),
  ]);
  const overridesById = new Map(overrides.map((o) => [o.coachaibleId, o]));

  const rows = results.map((r) => {
    const o = overridesById.get(r.id);
    return {
      id: r.id,
      title: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      basePosition: r.position,
      baseTotal: r.totalCompetitors,
      baseFleet: r.fleet,
      baseExternalUrl: r.externalUrl,
      override: o
        ? {
            position: o.position,
            totalCompetitors: o.totalCompetitors,
            fleet: o.fleet,
            externalUrl: o.externalUrl,
            notes: o.notes,
            hidden: o.hidden,
          }
        : null,
    };
  });

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        Results
      </p>
      <h1 className="mt-2 font-display text-h1 leading-tight">Edit results</h1>
      <p className="mt-3 max-w-prose text-body text-ink-3">
        These are the results currently surfaced on /results. Auto-pulled values
        come from World Sailing or the auto-scraper. Overrides (set here) take
        precedence; toggle “hide” to remove a result entirely. The auto-scrape
        pipeline is unaffected.
      </p>
      <ResultsTable rows={rows} />
    </div>
  );
}
