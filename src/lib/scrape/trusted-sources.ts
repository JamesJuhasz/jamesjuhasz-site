/*
  src/lib/scrape/trusted-sources.ts
  ---------------------------------------------------------------------------
  Human-in-the-loop learning store. Each time a reviewer approves a verified
  result WITHOUT editing the extracted fields, we record a +1 approval for
  the source domain. Subsequent verification runs read this store and
  promote the source-tier of approved domains so future extractions from
  the same domain start with higher confidence.

  Why "no-edit" is the trust signal:
    - Approve without edit  ⇒ machine extraction was correct  ⇒ trust the source.
    - Approve with edits    ⇒ machine extraction needed correction ⇒ NO trust signal
                             (the data was right but the verifier didn't
                              extract it cleanly — possibly the source is hard
                              to scrape, not that it's authoritative).

  Promotion rules (kept conservative — humans are slow and we have ~50 events):
    1+ approvals  →  at least MEDIUM (was LOW)
    3+ approvals  →  HIGH

  The store lives at src/data/results-trusted-sources.json so it's checked
  in alongside the verification outputs. Editable by hand if you want to
  seed trust without going through the UI.
*/

import { existsSync } from "node:fs";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { SourceTier } from "./types";

export type TrustedDomain = {
  approvals: number;
  lastApprovedAt: string;
  /** Optional human note ("hand-seeded after laser-worlds 2021 win"). */
  note?: string;
};

export type TrustedSourcesFile = {
  generatedAt: string;
  domains: Record<string, TrustedDomain>;
};

const DATA_DIR = path.join(process.cwd(), "src", "data");
export const TRUSTED_SOURCES_FILE = path.join(
  DATA_DIR,
  "results-trusted-sources.json",
);

const PROMOTE_TO_MEDIUM = 1; // 1 approval → at least MEDIUM
const PROMOTE_TO_HIGH = 3; // 3 approvals → HIGH

async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (!existsSync(file)) return fallback;
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

/** Read the full trusted-sources file (or an empty shell if missing). */
export async function readTrustedSources(): Promise<TrustedSourcesFile> {
  return readJson<TrustedSourcesFile>(TRUSTED_SOURCES_FILE, {
    generatedAt: "",
    domains: {},
  });
}

/** How many human approvals has this domain received? */
export async function getApprovalCount(domain: string): Promise<number> {
  const file = await readTrustedSources();
  return file.domains[domain.toLowerCase()]?.approvals ?? 0;
}

/** Increment the approval counter for a domain. Idempotent on the file. */
export async function recordApproval(
  domain: string,
  meta?: { note?: string },
): Promise<TrustedDomain> {
  const file = await readTrustedSources();
  const key = domain.toLowerCase();
  const prev = file.domains[key];
  const next: TrustedDomain = {
    approvals: (prev?.approvals ?? 0) + 1,
    lastApprovedAt: new Date().toISOString(),
    ...(prev?.note ? { note: prev.note } : {}),
    ...(meta?.note ? { note: meta.note } : {}),
  };
  file.domains[key] = next;
  file.generatedAt = new Date().toISOString();
  await writeJson(TRUSTED_SOURCES_FILE, file);
  return next;
}

/** Decrement (used when reverting an approval back to review). */
export async function unrecordApproval(domain: string): Promise<TrustedDomain | null> {
  const file = await readTrustedSources();
  const key = domain.toLowerCase();
  const prev = file.domains[key];
  if (!prev) return null;
  if (prev.approvals <= 1) {
    delete file.domains[key];
    file.generatedAt = new Date().toISOString();
    await writeJson(TRUSTED_SOURCES_FILE, file);
    return null;
  }
  const next: TrustedDomain = {
    ...prev,
    approvals: prev.approvals - 1,
  };
  file.domains[key] = next;
  file.generatedAt = new Date().toISOString();
  await writeJson(TRUSTED_SOURCES_FILE, file);
  return next;
}

/**
 * Apply the learning bonus on top of a base tier. Returns the same tier or
 * a higher one — never demotes. Pure function over an approval count so
 * the verifier can call it once per run after reading the store.
 */
export function tierWithLearning(
  baseTier: SourceTier,
  approvals: number,
): SourceTier {
  if (approvals >= PROMOTE_TO_HIGH) return "HIGH";
  if (approvals >= PROMOTE_TO_MEDIUM) {
    return baseTier === "LOW" ? "MEDIUM" : baseTier;
  }
  return baseTier;
}

/**
 * Synchronous variant for the verify-results pipeline: pre-load the file
 * once at run start, then ask for the promoted tier per URL without I/O.
 */
export type LearnedTrustIndex = ReadonlyMap<string, number>; // domain → approvals

export async function loadLearnedTrustIndex(): Promise<LearnedTrustIndex> {
  const file = await readTrustedSources();
  const map = new Map<string, number>();
  for (const [domain, entry] of Object.entries(file.domains)) {
    map.set(domain.toLowerCase(), entry.approvals);
  }
  return map;
}

export function promotedTier(
  baseTier: SourceTier,
  domain: string,
  index: LearnedTrustIndex,
): SourceTier {
  const approvals = index.get(domain.toLowerCase()) ?? 0;
  return tierWithLearning(baseTier, approvals);
}
