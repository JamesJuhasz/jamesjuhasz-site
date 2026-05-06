/*
  src/lib/scrape/verified-accessor.ts
  ---------------------------------------------------------------------------
  Read-only accessor for the verified-results JSON file. Loaded at import
  time so server components and library code can use it synchronously. The
  file is written by scripts/verify-results.ts and is checked into the repo
  (matches the pattern used for world-sailing-events.json, press-auto, etc.).

  Importers should call getVerified(eventId) and treat undefined as "not yet
  verified — render WS data alone."
*/

import verifiedRaw from "@/data/results-verified.json";
import type { ResultsVerifiedFile, VerifiedResult } from "./types";

const _file = verifiedRaw as ResultsVerifiedFile;
const _byId = new Map<string, VerifiedResult>(
  _file.results.map((r) => [r.worldSailingEventId, r]),
);

export function getVerified(worldSailingEventId: string): VerifiedResult | undefined {
  return _byId.get(worldSailingEventId);
}

export function getAllVerified(): VerifiedResult[] {
  return _file.results;
}

export function getVerifiedMeta(): { generatedAt: string; count: number } {
  return { generatedAt: _file.generatedAt, count: _file.results.length };
}
