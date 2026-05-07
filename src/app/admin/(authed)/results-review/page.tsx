import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ResultsReviewClient,
  type ReviewRow,
} from "@/app/results-review/ResultsReviewClient";
import type {
  ResultsReviewFile,
  ResultsVerifiedFile,
  WSEventLite,
} from "@/lib/scrape/types";
import { readTrustedSources } from "@/lib/scrape/trusted-sources";

export const metadata = {
  title: "Results review (admin)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

type WSDump = { events: WSEventLite[] };

export default async function AdminResultsReviewPage() {
  const [review, verified, ws, trusted] = await Promise.all([
    readJson<ResultsReviewFile>(path.join(DATA_DIR, "results-review.json"), {
      generatedAt: "",
      results: [],
    }),
    readJson<ResultsVerifiedFile>(
      path.join(DATA_DIR, "results-verified.json"),
      { generatedAt: "", results: [] },
    ),
    readJson<WSDump>(path.join(DATA_DIR, "world-sailing-events.json"), {
      events: [],
    }),
    readTrustedSources(),
  ]);

  const trustedCounts: Record<string, number> = {};
  for (const [domain, entry] of Object.entries(trusted.domains)) {
    trustedCounts[domain.toLowerCase()] = entry.approvals;
  }

  const eventsById = new Map(
    ws.events.map((e) => [e.worldSailingEventId, e] as const),
  );

  const rows: ReviewRow[] = review.results
    .map((r) => {
      const ev = eventsById.get(r.worldSailingEventId);
      if (!ev) return null;
      return {
        eventId: r.worldSailingEventId,
        regattaName: ev.regattaName,
        startDate: ev.startDate,
        endDate: ev.endDate,
        wsPosition: ev.position,
        wsClass: ev.className,
        wsRegattaWebsite: ev.regattaWebsite,
        confidenceScore: r.confidenceScore,
        confidenceBreakdown: r.confidenceBreakdown,
        externalPosition: r.externalPosition,
        totalCompetitors: r.totalCompetitors,
        fleet: r.fleet,
        primarySource: r.primarySource,
        candidates: r.candidates,
        reviewReasons: r.reviewReasons,
      };
    })
    .filter((r): r is ReviewRow => r !== null)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        Results review queue
      </p>
      <h1 className="mt-2 font-display text-h1 leading-tight">
        Pending results
      </h1>
      <p className="mt-3 max-w-prose text-body text-ink-3">
        {rows.length} pending · {verified.results.length} already verified.
        Sorted by confidence score (highest first). Approve / reject decisions
        currently write to <code className="bg-ink/5 px-1">src/data/*.json</code>
        — works in dev. Production-safe DB-backed reviews are tracked as a
        follow-up.
      </p>
      <div className="mt-6">
        <ResultsReviewClient
          initialRows={rows}
          initialCounts={{
            verified: verified.results.length,
            review: rows.length,
          }}
          initialDomainApprovals={trustedCounts}
        />
      </div>
    </div>
  );
}
