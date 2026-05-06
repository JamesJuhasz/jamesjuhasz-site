import { readFile } from "node:fs/promises";
import path from "node:path";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ResultsReviewClient, type ReviewRow } from "./ResultsReviewClient";
import type {
  ResultsReviewFile,
  ResultsVerifiedFile,
  WSEventLite,
} from "@/lib/scrape/types";
import { readTrustedSources } from "@/lib/scrape/trusted-sources";

/*
  /results-review — internal review queue.
  Server reads results-review.json + world-sailing-events.json, then the
  client component renders cards with Approve / Reject buttons that call
  /api/results-review. NOT for public launch.
*/

export const metadata = {
  title: "Results Review (internal)",
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

export default async function ResultsReviewPage() {
  const [review, verified, ws, trusted] = await Promise.all([
    readJson<ResultsReviewFile>(path.join(DATA_DIR, "results-review.json"), {
      generatedAt: "",
      results: [],
    }),
    readJson<ResultsVerifiedFile>(path.join(DATA_DIR, "results-verified.json"), {
      generatedAt: "",
      results: [],
    }),
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
    <div className="py-section-y">
      <Container width="wide">
        <Badge tone="donate">Internal — remove before launch</Badge>
        <h1 className="mt-4 font-display text-display text-ink">
          Results review queue
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-ink/75">
          {rows.length} pending · {verified.results.length} already verified.
          Sorted by confidence score (highest first). Open the source URL in a
          new tab to verify the row, then{" "}
          <strong>Approve</strong> to promote to{" "}
          <code className="bg-fog px-1.5 py-0.5 rounded text-caption">
            results-verified.json
          </code>{" "}
          or <strong>Reject</strong> to file as rejected. Files write
          synchronously on each click.
        </p>
        <ResultsReviewClient
          initialRows={rows}
          initialCounts={{
            verified: verified.results.length,
            review: rows.length,
          }}
          initialDomainApprovals={trustedCounts}
        />
      </Container>
    </div>
  );
}
