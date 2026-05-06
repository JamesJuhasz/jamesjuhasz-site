/*
  src/lib/scrape/source-tier.ts
  ---------------------------------------------------------------------------
  Maps a URL/host to a SourceTier and its 0..1 score component.

  Rule of thumb:
    HIGH    federations + sites World Sailing itself links to (regattaWebsite)
    MEDIUM  scoring platforms (Manage2Sail, Sailwave, YachtScoring, etc.)
    LOW     news / blogs / general media

  WS's own regattaWebsite field is treated as HIGH at the call site even when
  the bare domain isn't in the HIGH list — World Sailing is the linker, so we
  trust the link.
*/

import type { SourceTier } from "./types";

const HIGH_DOMAINS: ReadonlyArray<string | RegExp> = [
  "sailing.org",
  "worldsailing.org",
  "ilca-dinghy.org",
  "eurilca.org",
  "eurilca.eu",
  /\beurilca-europeans\.org$/,
  /\bilca-worlds\.org$/,
  /\blaser-worlds\.com$/,
  "laserinternational.org",
  "sailing.ca",
  "ussailing.org",
  /\bfederation\b/,
  // Major regatta organizers — federation-adjacent.
  "cork.org",
  "trofeoprincesasofia.org",
  "kielerwoche.de",
  "kieler-woche.de",
  /\bkieler-woche\.de$/,
  "semaineolympique.com",
  /^hempelworldcup.*\.org$/,
  /^sailingworldcup.*\.org$/,
  "sof.ffvoile.fr",
  "ffvoile.fr",
  "allianzregatta.org",
  "vilamourasailing.com",
  "longbeachocr.org",
  "ilcaitalia.com",
  "clwyc.org",
  "miami.ussailing.org",
  "usopen.ussailing.org",
];

const MEDIUM_DOMAINS: ReadonlyArray<string | RegExp> = [
  "manage2sail.com",
  "sailwave.com",
  "yachtscoring.com",
  "regattanetwork.com",
  "raceqs.com",
  "estela.co",
  "tracktrac.com",
  "sailti.com",
];

const TIER_WEIGHT: Record<SourceTier, number> = {
  HIGH: 1.0,
  MEDIUM: 0.85,
  LOW: 0.6,
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function matches(host: string, patterns: ReadonlyArray<string | RegExp>): boolean {
  return patterns.some((p) =>
    typeof p === "string" ? host === p || host.endsWith(`.${p}`) : p.test(host),
  );
}

/** Classify a URL's host into a tier. Unknown hosts default to LOW. */
export function tierOf(url: string): SourceTier {
  const host = hostnameOf(url);
  if (!host) return "LOW";
  if (matches(host, HIGH_DOMAINS)) return "HIGH";
  if (matches(host, MEDIUM_DOMAINS)) return "MEDIUM";
  return "LOW";
}

/**
 * Tier with learned-trust applied. Pass an approval count from the
 * trusted-sources store; an unknown host that's been approved 3+ times
 * is treated as HIGH. Pure function — verifier reads the store once and
 * calls this per URL.
 */
export function tierOfWithLearning(url: string, approvals: number): SourceTier {
  const base = tierOf(url);
  if (approvals >= 3) return "HIGH";
  if (approvals >= 1 && base === "LOW") return "MEDIUM";
  return base;
}

/** Convert a tier to its 0..1 score component. */
export function tierScore(tier: SourceTier): number {
  return TIER_WEIGHT[tier];
}

/** Hostname helper for storing in candidates. */
export function domainOf(url: string): string {
  return hostnameOf(url);
}
