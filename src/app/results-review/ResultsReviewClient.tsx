"use client";

import { useState } from "react";
import { Check, X, ExternalLink, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  ConfidenceBreakdown,
  ResultCandidate,
  VerifiedResult,
} from "@/lib/scrape/types";

export type ReviewRow = {
  eventId: string;
  regattaName: string;
  startDate: string;
  endDate: string;
  wsPosition: number | null;
  wsClass: string;
  wsRegattaWebsite: string | null;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  externalPosition: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  primarySource: VerifiedResult["primarySource"];
  candidates: ResultCandidate[];
  reviewReasons: string[];
};

type ActionState = "idle" | "saving" | "done" | "error";
type RowAction = { state: ActionState; outcome: "approved" | "rejected" | null };

type RowEdit = {
  externalPosition: string; // text input value
  totalCompetitors: string;
  fleet: string;
  primarySourceUrl: string;
};

const SCORE_KEYS: ReadonlyArray<keyof ConfidenceBreakdown> = [
  "nameMatch",
  "eventNameMatch",
  "dateOverlap",
  "classMatch",
  "positionAgreement",
  "sourceTier",
];

const SCORE_LABEL: Record<keyof ConfidenceBreakdown, string> = {
  nameMatch: "Name",
  eventNameMatch: "Event",
  dateOverlap: "Date",
  classMatch: "Class",
  positionAgreement: "Pos",
  sourceTier: "Tier",
};

function scoreColor(score: number): string {
  if (score >= 0.9) return "text-green-700";
  if (score >= 0.7) return "text-amber-700";
  if (score >= 0.4) return "text-orange-700";
  return "text-red-700";
}

function scoreBg(score: number): string {
  if (score >= 0.9) return "bg-green-500";
  if (score >= 0.7) return "bg-amber-500";
  if (score >= 0.4) return "bg-orange-500";
  return "bg-red-500";
}

function formatDateRange(start: string, end: string): string {
  const fmt = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  if (start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function rowEditFromRow(row: ReviewRow): RowEdit {
  return {
    externalPosition:
      row.externalPosition !== null ? String(row.externalPosition) : "",
    totalCompetitors:
      row.totalCompetitors !== null ? String(row.totalCompetitors) : "",
    fleet: row.fleet ?? "",
    primarySourceUrl: row.primarySource.url,
  };
}

function isDirty(row: ReviewRow, edit: RowEdit): boolean {
  const orig = rowEditFromRow(row);
  return (
    edit.externalPosition !== orig.externalPosition ||
    edit.totalCompetitors !== orig.totalCompetitors ||
    edit.fleet !== orig.fleet ||
    edit.primarySourceUrl !== orig.primarySourceUrl
  );
}

function buildOverrides(row: ReviewRow, edit: RowEdit) {
  const out: Record<string, unknown> = {};
  const orig = rowEditFromRow(row);

  if (edit.externalPosition !== orig.externalPosition) {
    if (edit.externalPosition === "") out.externalPosition = null;
    else {
      const n = Number.parseInt(edit.externalPosition, 10);
      if (Number.isFinite(n) && n > 0) out.externalPosition = n;
    }
  }
  if (edit.totalCompetitors !== orig.totalCompetitors) {
    if (edit.totalCompetitors === "") out.totalCompetitors = null;
    else {
      const n = Number.parseInt(edit.totalCompetitors, 10);
      if (Number.isFinite(n) && n > 0) out.totalCompetitors = n;
    }
  }
  if (edit.fleet !== orig.fleet) {
    out.fleet = edit.fleet === "" ? null : edit.fleet;
  }
  if (
    edit.primarySourceUrl !== orig.primarySourceUrl &&
    edit.primarySourceUrl !== ""
  ) {
    out.primarySourceUrl = edit.primarySourceUrl;
  }
  return out;
}

export function ResultsReviewClient({
  initialRows,
  initialCounts,
  initialDomainApprovals,
}: {
  initialRows: ReviewRow[];
  initialCounts: { verified: number; review: number };
  /** domain (lowercased hostname) → approval count, for trust badges. */
  initialDomainApprovals: Record<string, number>;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const [counts, setCounts] = useState(initialCounts);
  const [actions, setActions] = useState<Record<string, RowAction>>({});
  const [domainApprovals, setDomainApprovals] = useState<Record<string, number>>(
    initialDomainApprovals,
  );
  const [edits, setEdits] = useState<Record<string, RowEdit>>(() => {
    const initial: Record<string, RowEdit> = {};
    for (const r of initialRows) initial[r.eventId] = rowEditFromRow(r);
    return initial;
  });

  const domainOf = (urlOrDomain: string): string => {
    try {
      return new URL(urlOrDomain).hostname.toLowerCase();
    } catch {
      return urlOrDomain.toLowerCase();
    }
  };
  const approvalsFor = (domain: string): number =>
    domainApprovals[domain.toLowerCase()] ?? 0;

  const updateEdit = (eventId: string, patch: Partial<RowEdit>) => {
    setEdits((prev) => ({ ...prev, [eventId]: { ...prev[eventId], ...patch } }));
  };

  const resetEdit = (row: ReviewRow) => {
    setEdits((prev) => ({ ...prev, [row.eventId]: rowEditFromRow(row) }));
  };

  const submit = async (eventId: string, action: "approve" | "reject") => {
    setActions((prev) => ({
      ...prev,
      [eventId]: { state: "saving", outcome: null },
    }));
    try {
      const row = rows.find((r) => r.eventId === eventId);
      const overrides =
        action === "approve" && row ? buildOverrides(row, edits[eventId]) : undefined;
      const body: Record<string, unknown> = { eventId, action };
      if (overrides && Object.keys(overrides).length > 0) {
        body.overrides = overrides;
      }
      const res = await fetch("/api/results-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = (await res.json()) as {
        ok: boolean;
        counts?: { verified: number; review: number };
        learnedDomain?: { domain: string; approvals: number } | null;
      };
      if (!data.ok) throw new Error("api returned not ok");
      setActions((prev) => ({
        ...prev,
        [eventId]: {
          state: "done",
          outcome: action === "approve" ? "approved" : "rejected",
        },
      }));
      if (data.counts) {
        setCounts({ verified: data.counts.verified, review: data.counts.review });
      }
      // Bump local trust counter so other rows on the same domain show the
      // updated badge immediately, without a page reload.
      if (data.learnedDomain) {
        const d = data.learnedDomain.domain.toLowerCase();
        setDomainApprovals((prev) => ({ ...prev, [d]: data.learnedDomain!.approvals }));
      }
      setTimeout(() => {
        setRows((prev) => prev.filter((r) => r.eventId !== eventId));
      }, 600);
    } catch {
      setActions((prev) => ({
        ...prev,
        [eventId]: { state: "error", outcome: null },
      }));
    }
  };

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-10 -mx-4 mb-4 bg-paper/95 px-4 py-2 backdrop-blur ring-1 ring-mist rounded">
        <p className="text-caption text-ink/70">
          <strong className="text-ink">{counts.verified}</strong> verified ·{" "}
          <strong className="text-ink">{counts.review}</strong> in review ·{" "}
          {rows.length} visible
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded bg-fog p-6 text-center text-body text-ink/70">
          No pending reviews. 🎉
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const action = actions[row.eventId];
            const isSaving = action?.state === "saving";
            const isDone = action?.state === "done";
            const isError = action?.state === "error";
            const edit = edits[row.eventId];
            const dirty = edit ? isDirty(row, edit) : false;
            const positionsAgree =
              row.wsPosition !== null &&
              row.externalPosition !== null &&
              row.wsPosition === row.externalPosition;
            const positionsDisagree =
              row.wsPosition !== null &&
              row.externalPosition !== null &&
              row.wsPosition !== row.externalPosition;

            return (
              <li
                key={row.eventId}
                className={cn(
                  "rounded-lg ring-1 ring-mist bg-paper p-5 transition-all",
                  isDone && action?.outcome === "approved" && "ring-green-500 bg-green-50",
                  isDone && action?.outcome === "rejected" && "ring-red-500 bg-red-50",
                  dirty && !isDone && "ring-amber-400",
                )}
              >
                {/* Header: regatta name + dates + score + buttons */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-caption font-bold",
                          scoreColor(row.confidenceScore),
                        )}
                      >
                        {row.confidenceScore.toFixed(2)}
                      </span>
                      <span className="text-caption text-ink/60">
                        {formatDateRange(row.startDate, row.endDate)}
                      </span>
                      <span className="text-caption text-ink/50">
                        · {row.wsClass}
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-h4 text-ink">
                      {row.regattaName}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {dirty && !isDone && (
                      <button
                        type="button"
                        onClick={() => resetEdit(row)}
                        className="inline-flex items-center gap-1 text-caption text-ink/60 hover:text-ink"
                        title="Discard edits"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => submit(row.eventId, "approve")}
                      disabled={isSaving || isDone}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-caption font-medium ring-1 transition-all",
                        "ring-green-600 text-green-700 hover:bg-green-600 hover:text-paper",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isDone && action?.outcome === "approved" && "bg-green-600 text-paper",
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      {dirty ? "Save & approve" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => submit(row.eventId, "reject")}
                      disabled={isSaving || isDone}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-caption font-medium ring-1 transition-all",
                        "ring-red-600 text-red-700 hover:bg-red-600 hover:text-paper",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isDone && action?.outcome === "rejected" && "bg-red-600 text-paper",
                      )}
                    >
                      <X className="size-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Editable data row: position / total / fleet, each with the
                    source URL inline so you can verify before edit. */}
                <div className="mt-4 grid grid-cols-1 gap-3 rounded bg-fog/60 p-3 sm:grid-cols-[1fr_1fr_2fr]">
                  <FieldGroup
                    label="Position"
                    hint={
                      row.wsPosition !== null ? (
                        <span
                          className={cn(
                            "text-ink/60",
                            positionsAgree && "text-green-700",
                            positionsDisagree && "text-red-700",
                          )}
                        >
                          WS: {row.wsPosition}
                        </span>
                      ) : (
                        <span className="text-ink/40">WS: —</span>
                      )
                    }
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={edit?.externalPosition ?? ""}
                      onChange={(e) =>
                        updateEdit(row.eventId, { externalPosition: e.target.value })
                      }
                      placeholder="e.g. 23"
                      disabled={isSaving || isDone}
                      className="w-full rounded border-0 bg-paper px-2 py-1 font-mono text-body ring-1 ring-mist focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="Total competitors"
                    hint={<span className="text-ink/40">optional</span>}
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={edit?.totalCompetitors ?? ""}
                      onChange={(e) =>
                        updateEdit(row.eventId, { totalCompetitors: e.target.value })
                      }
                      placeholder="e.g. 132"
                      disabled={isSaving || isDone}
                      className="w-full rounded border-0 bg-paper px-2 py-1 font-mono text-body ring-1 ring-mist focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="Fleet"
                    hint={<span className="text-ink/40">e.g. Gold Fleet</span>}
                  >
                    <input
                      type="text"
                      value={edit?.fleet ?? ""}
                      onChange={(e) =>
                        updateEdit(row.eventId, { fleet: e.target.value })
                      }
                      placeholder="(blank if not split)"
                      disabled={isSaving || isDone}
                      className="w-full rounded border-0 bg-paper px-2 py-1 text-body ring-1 ring-mist focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </FieldGroup>
                </div>

                {/* Source URL row — editable, with open-link button, tier
                    badge, and learned-trust counter so the reviewer sees how
                    "known" this domain is from prior approvals. */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="shrink-0 text-caption text-ink/60">
                    Source:
                  </span>
                  <input
                    type="url"
                    value={edit?.primarySourceUrl ?? ""}
                    onChange={(e) =>
                      updateEdit(row.eventId, { primarySourceUrl: e.target.value })
                    }
                    placeholder="https://…"
                    disabled={isSaving || isDone}
                    className="min-w-0 flex-1 rounded border-0 bg-paper px-2 py-1 font-mono text-caption ring-1 ring-mist focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                  <a
                    href={edit?.primarySourceUrl || row.primarySource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-caption text-ink ring-1 ring-mist hover:bg-fog"
                  >
                    <ExternalLink className="size-3.5" />
                    Open
                  </a>
                  <span className="shrink-0 text-caption text-ink/50">
                    ({row.primarySource.tier})
                  </span>
                  <TrustBadge
                    approvals={approvalsFor(
                      domainOf(edit?.primarySourceUrl || row.primarySource.url),
                    )}
                  />
                </div>

                {/* Other-candidate links: gives reviewer alternates to copy-paste */}
                {row.candidates.length > 1 && (
                  <details className="mt-2 text-caption">
                    <summary className="cursor-pointer text-ink/60 hover:text-ink">
                      {row.candidates.length - 1} other candidate
                      {row.candidates.length > 2 ? "s" : ""} considered
                    </summary>
                    <ul className="mt-1 space-y-1 pl-4">
                      {row.candidates
                        .filter((c) => c.url !== row.primarySource.url)
                        .map((c, i) => (
                          <li
                            key={`${c.url}-${i}`}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span className="font-mono text-ink/60">
                              {c.confidenceScore.toFixed(2)}
                            </span>
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-ink underline decoration-mist underline-offset-2 hover:decoration-ink"
                            >
                              <ExternalLink className="size-3" />
                              {c.domain}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                updateEdit(row.eventId, {
                                  primarySourceUrl: c.url,
                                })
                              }
                              className="text-ink/60 underline decoration-dotted hover:text-ink"
                            >
                              use this URL
                            </button>
                            {c.externalPosition !== null && (
                              <span className="text-ink/50">
                                pos {c.externalPosition}
                                {c.fleet ? ` · ${c.fleet}` : ""}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}

                {row.wsRegattaWebsite &&
                  row.wsRegattaWebsite !== row.primarySource.url && (
                    <div className="mt-2 text-caption">
                      <a
                        href={row.wsRegattaWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-ink/60 hover:text-ink"
                      >
                        <ExternalLink className="size-3.5" />
                        WS-recorded site
                      </a>
                    </div>
                  )}

                {/* Confidence breakdown bars */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
                  {SCORE_KEYS.map((k) => {
                    const v = row.confidenceBreakdown[k];
                    return (
                      <div key={k}>
                        <div className="flex items-baseline justify-between text-caption">
                          <span className="text-ink/60">{SCORE_LABEL[k]}</span>
                          <span className="font-mono text-ink">{v.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded bg-fog">
                          <div
                            className={cn("h-full rounded", scoreBg(v))}
                            style={{ width: `${Math.round(v * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Review reasons */}
                {row.reviewReasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.reviewReasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded bg-fog px-2 py-0.5 text-caption text-ink/70 ring-1 ring-mist"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {isError && (
                  <p className="mt-3 text-caption text-red-700">
                    Save failed. Check the dev server logs and try again.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Visualizes how much the system has learned to trust a source domain.
 * Approvals come from prior no-edit "Approve as-is" clicks on results from
 * the same hostname, recorded in src/data/results-trusted-sources.json.
 *
 * Thresholds match `tierWithLearning()` in src/lib/scrape/trusted-sources.ts:
 *   1+ approvals  →  promote LOW → MEDIUM
 *   3+ approvals  →  promote anything → HIGH
 */
function TrustBadge({ approvals }: { approvals: number }) {
  if (approvals <= 0) return null;
  const willPromoteToHigh = approvals >= 3;
  return (
    <span
      title={
        willPromoteToHigh
          ? `Trusted source — ${approvals} prior approvals. Future runs treat this domain as HIGH tier.`
          : `${approvals} prior approval${approvals === 1 ? "" : "s"}. ${
              3 - approvals
            } more without edits → promoted to HIGH tier.`
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-caption ring-1",
        willPromoteToHigh
          ? "bg-green-50 text-green-700 ring-green-300"
          : "bg-amber-50 text-amber-700 ring-amber-300",
      )}
    >
      <Sparkles className="size-3" />
      Trusted ×{approvals}
    </span>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-caption">
        <span className="font-medium text-ink/70">{label}</span>
        {hint}
      </div>
      {children}
    </div>
  );
}
