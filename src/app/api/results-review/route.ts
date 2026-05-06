/*
  /api/results-review — internal review-queue actions.
  POST { eventId, action: "approve" | "reject" }
    approve → move from results-review.json into results-verified.json
    reject  → move from results-review.json into results-rejected.json
              (with a `reason: "human-rejected"` synthetic entry)
  Dev-only; refuses in production.
*/

import { NextResponse, type NextRequest } from "next/server";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  ResultsRejectedFile,
  ResultsReviewFile,
  ResultsVerifiedFile,
  RejectedEntry,
} from "@/lib/scrape/types";
import {
  recordApproval,
  getApprovalCount,
} from "@/lib/scrape/trusted-sources";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const VERIFIED_FILE = path.join(DATA_DIR, "results-verified.json");
const REVIEW_FILE = path.join(DATA_DIR, "results-review.json");
const REJECTED_FILE = path.join(DATA_DIR, "results-rejected.json");

const OverridesSchema = z
  .object({
    externalPosition: z.number().int().positive().nullable().optional(),
    totalCompetitors: z.number().int().positive().nullable().optional(),
    fleet: z.string().nullable().optional(),
    primarySourceUrl: z.string().url().optional(),
  })
  .optional();

const BodySchema = z.object({
  eventId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  overrides: OverridesSchema,
});

function devOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "disabled in production" },
      { status: 404 },
    );
  }
  return null;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  const tmp = file + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

export async function POST(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { eventId, action, overrides } = parsed.data;

  const [verified, review, rejected] = await Promise.all([
    readJson<ResultsVerifiedFile>(VERIFIED_FILE, { generatedAt: "", results: [] }),
    readJson<ResultsReviewFile>(REVIEW_FILE, { generatedAt: "", results: [] }),
    readJson<ResultsRejectedFile>(REJECTED_FILE, { generatedAt: "", entries: [] }),
  ]);

  const entry = review.results.find((r) => r.worldSailingEventId === eventId);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "not_in_review" },
      { status: 404 },
    );
  }

  // Drop from review.
  review.results = review.results.filter((r) => r.worldSailingEventId !== eventId);

  // Did the reviewer change anything? An "approve as-is" is a strong trust
  // signal (the verifier got it right) and feeds the learning store. An
  // "approve with edits" means the source was wrong-but-fixable — no trust
  // signal, since we can't tell the verifier "this domain is reliable" when
  // the reviewer just corrected its output.
  const hasOverrides =
    overrides !== undefined &&
    Object.keys(overrides).length > 0 &&
    Object.values(overrides).some((v) => v !== undefined);

  let approvalCount: number | null = null;

  if (action === "approve") {
    // Apply human overrides on top of the machine extraction. The override
    // only mutates the published fields (position / fleet / total / source
    // URL). The original `candidates` array is preserved untouched so the
    // provenance trail survives.
    const approved = {
      ...entry,
      needsReview: false,
      externalPosition:
        overrides?.externalPosition !== undefined
          ? overrides.externalPosition
          : entry.externalPosition,
      totalCompetitors:
        overrides?.totalCompetitors !== undefined
          ? overrides.totalCompetitors
          : entry.totalCompetitors,
      fleet:
        overrides?.fleet !== undefined ? overrides.fleet : entry.fleet,
      primarySource:
        overrides?.primarySourceUrl &&
        overrides.primarySourceUrl !== entry.primarySource.url
          ? {
              ...entry.primarySource,
              url: overrides.primarySourceUrl,
              domain: (() => {
                try {
                  return new URL(overrides.primarySourceUrl).hostname;
                } catch {
                  return entry.primarySource.domain;
                }
              })(),
            }
          : entry.primarySource,
    };
    // Drop any prior verified entry for this id, then push.
    verified.results = verified.results.filter((r) => r.worldSailingEventId !== eventId);
    verified.results.push(approved);
    verified.results.sort((a, b) => a.worldSailingEventId.localeCompare(b.worldSailingEventId));

    // Trust signal: if the reviewer didn't override anything, increment the
    // approval count for the source domain. Future verifier runs will see
    // this domain at a higher tier.
    if (!hasOverrides) {
      const { approvals } = await recordApproval(approved.primarySource.domain);
      approvalCount = approvals;
    }
  } else {
    // Reject: persist as a rejected entry with the candidates we have.
    const synthetic: RejectedEntry = {
      worldSailingEventId: eventId,
      reason: "low-confidence",
      attemptCount: 99, // human rejection — don't auto-retry
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: null,
      candidates: entry.candidates ?? [],
    };
    rejected.entries = rejected.entries.filter((e) => e.worldSailingEventId !== eventId);
    rejected.entries.push(synthetic);
    rejected.entries.sort((a, b) =>
      a.worldSailingEventId.localeCompare(b.worldSailingEventId),
    );
  }

  const stamp = new Date().toISOString();
  verified.generatedAt = stamp;
  review.generatedAt = stamp;
  rejected.generatedAt = stamp;

  await Promise.all([
    writeJson(VERIFIED_FILE, verified),
    writeJson(REVIEW_FILE, review),
    writeJson(REJECTED_FILE, rejected),
  ]);

  return NextResponse.json({
    ok: true,
    counts: {
      verified: verified.results.length,
      review: review.results.length,
      rejected: rejected.entries.length,
    },
    learnedDomain:
      action === "approve" && !hasOverrides && approvalCount !== null
        ? { domain: entry.primarySource.domain, approvals: approvalCount }
        : null,
  });
}

/**
 * GET → return current approval counts per domain (for the review UI badges).
 * Dev-only.
 */
export async function GET() {
  const guard = devOnly();
  if (guard) return guard;
  const review = await readJson<ResultsReviewFile>(REVIEW_FILE, {
    generatedAt: "",
    results: [],
  });
  const domains = new Set<string>();
  for (const r of review.results) {
    if (r.primarySource?.domain) domains.add(r.primarySource.domain.toLowerCase());
    for (const c of r.candidates ?? []) {
      if (c.domain) domains.add(c.domain.toLowerCase());
    }
  }
  const counts: Record<string, number> = {};
  for (const d of domains) {
    counts[d] = await getApprovalCount(d);
  }
  return NextResponse.json({ counts });
}

