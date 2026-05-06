type VenuePattern = { pattern: RegExp; country: string };

const PATTERNS: VenuePattern[] = [
  { pattern: /\bRNSYS\b/i, country: "Canada" },
  { pattern: /\bHalifax\b/i, country: "Canada" },
  { pattern: /\bHali\b/i, country: "Canada" },
  { pattern: /\bKingston\b/i, country: "Canada" },
  { pattern: /\bCORK\b/i, country: "Canada" },
  { pattern: /\bToronto\b/i, country: "Canada" },
  { pattern: /\bMontreal\b/i, country: "Canada" },
  { pattern: /\bVancouver\b/i, country: "Canada" },
  { pattern: /\bOakville\b/i, country: "Canada" },
  { pattern: /\bGTBSC\b/i, country: "Canada" },

  { pattern: /\bPalma\b/i, country: "Spain" },
  { pattern: /\bMallorca\b/i, country: "Spain" },
  { pattern: /\bPrincess?a?\s+Sof[ií]a\b/i, country: "Spain" },
  { pattern: /\bC[áa]diz\b/i, country: "Spain" },
  { pattern: /\bBarcelona\b/i, country: "Spain" },

  { pattern: /\bHy[èeé]res\b/i, country: "France" },
  { pattern: /\bMarseille\b/i, country: "France" },
  { pattern: /\bBrest\b/i, country: "France" },
  { pattern: /\bLa\s+Rochelle\b/i, country: "France" },
  { pattern: /\bSemaine Olympique\b/i, country: "France" },

  { pattern: /\bKiel\b/i, country: "Germany" },
  { pattern: /\bWarnem[uü]nde\b/i, country: "Germany" },

  { pattern: /\bGarda\b/i, country: "Italy" },
  { pattern: /\bGenoa\b/i, country: "Italy" },
  { pattern: /\bGenova\b/i, country: "Italy" },
  { pattern: /\bRiva\b/i, country: "Italy" },

  { pattern: /\bHelsinki\b/i, country: "Finland" },
  { pattern: /\bp[uo]hri?niemi\b/i, country: "Finland" },

  { pattern: /\bMedemblik\b/i, country: "Netherlands" },
  { pattern: /\bScheveningen\b/i, country: "Netherlands" },
  { pattern: /\bDelta\s+Lloyd\b/i, country: "Netherlands" },

  { pattern: /\bWeymouth\b/i, country: "UK" },
  { pattern: /\bPortland\b/i, country: "UK" },

  { pattern: /\bVilamoura\b/i, country: "Portugal" },
  { pattern: /\bCascais\b/i, country: "Portugal" },
  { pattern: /\bLagos\b/i, country: "Portugal" },

  { pattern: /\bMiami\b/i, country: "USA" },
  { pattern: /\bLong\s+Beach\b/i, country: "USA" },
  { pattern: /\bLos\s+Angeles\b/i, country: "USA" },
  { pattern: /\bClearwater\b/i, country: "USA" },
  { pattern: /\bNewport\b/i, country: "USA" },
  { pattern: /\bSan\s+Diego\b/i, country: "USA" },
  { pattern: /\bHouston\b/i, country: "USA" },

  { pattern: /\bAthens\b/i, country: "Greece" },
  { pattern: /\bSounion\b/i, country: "Greece" },
  { pattern: /\bThessaloniki\b/i, country: "Greece" },

  { pattern: /\bSydney\b/i, country: "Australia" },
  { pattern: /\bMelbourne\b/i, country: "Australia" },
  { pattern: /\bPerth\b/i, country: "Australia" },

  { pattern: /\bAuckland\b/i, country: "New Zealand" },

  { pattern: /\bEnoshima\b/i, country: "Japan" },
  { pattern: /\bTokyo\b/i, country: "Japan" },

  { pattern: /\bMalta\b/i, country: "Malta" },
  { pattern: /\bSailCoach\b/i, country: "Malta" },

  { pattern: /\bMar\s+del\s+Plata\b/i, country: "Argentina" },
  { pattern: /\bBuenos\s+Aires\b/i, country: "Argentina" },

  { pattern: /\bTallinn\b/i, country: "Estonia" },
  { pattern: /\bAarhus\b|\bÅrhus\b/i, country: "Denmark" },
  { pattern: /\bGda[ńn]sk\b/i, country: "Poland" },
  { pattern: /\bGdynia\b/i, country: "Poland" },
  { pattern: /\bMedulin\b|\bPula\b|\bTrogir\b|\bSplit\b/i, country: "Croatia" },
  { pattern: /\bCarnac\b|\bQuiberon\b|\bLa\s+Grande[- ]Motte\b/i, country: "France" },
  { pattern: /\bLymington\b/i, country: "UK" },
  { pattern: /\bMussanah\b|\bOman\b/i, country: "Oman" },
  { pattern: /\bFortaleza\b|\bRecife\b|\bSalvador\b|\bFlorianóp?olis\b/i, country: "Brazil" },
];

export function lookupCountry(venue: string): string | null {
  if (!venue) return null;
  for (const { pattern, country } of PATTERNS) {
    if (pattern.test(venue)) return country;
  }
  return null;
}
