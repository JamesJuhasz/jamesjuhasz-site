export type VenueInfo = {
  city: string;
  country: string;
  wikiTitle: string;
};

type VenuePattern = { pattern: RegExp; info: VenueInfo; years?: [number, number] };

const VENUES: VenuePattern[] = [
  // ILCA 7 Senior Men's World Championship — venue rotates yearly
  { pattern: /\bWorlds?\b/i, years: [2026, 2026], info: { city: "Dún Laoghaire", country: "Ireland", wikiTitle: "Dún Laoghaire" } },
  { pattern: /\bWorlds?\b/i, years: [2027, 2027], info: { city: "Fortaleza", country: "Brazil", wikiTitle: "Fortaleza" } },

  // Canada — specific venues first
  { pattern: /\bRNSYS\b/i, info: { city: "Halifax, Nova Scotia", country: "Canada", wikiTitle: "Halifax, Nova Scotia" } },
  { pattern: /\bGTBSC\b/i, info: { city: "Toronto", country: "Canada", wikiTitle: "Toronto" } },
  { pattern: /\bCORK\b/i, info: { city: "Kingston, Ontario", country: "Canada", wikiTitle: "Kingston, Ontario" } },
  { pattern: /\bCanadians?\b/i, info: { city: "Kingston, Ontario", country: "Canada", wikiTitle: "Kingston, Ontario" } },
  { pattern: /\bKingston\b/i, info: { city: "Kingston, Ontario", country: "Canada", wikiTitle: "Kingston, Ontario" } },
  { pattern: /\bHalifax\b|\bHali\b/i, info: { city: "Halifax, Nova Scotia", country: "Canada", wikiTitle: "Halifax, Nova Scotia" } },
  { pattern: /\bToronto\b/i, info: { city: "Toronto", country: "Canada", wikiTitle: "Toronto" } },
  { pattern: /\bVancouver\b/i, info: { city: "Vancouver", country: "Canada", wikiTitle: "Vancouver" } },
  { pattern: /\bMontreal\b/i, info: { city: "Montreal", country: "Canada", wikiTitle: "Montreal" } },
  { pattern: /\bOakville\b/i, info: { city: "Oakville, Ontario", country: "Canada", wikiTitle: "Oakville, Ontario" } },

  // National & regional championships (event name → typical host city)
  { pattern: /\bAus(?:tralian)?\s*Nats?\b/i, info: { city: "Melbourne", country: "Australia", wikiTitle: "Sandringham, Victoria" } },
  { pattern: /\bVic(?:torian)?\s*(State|Champ)/i, info: { city: "Melbourne", country: "Australia", wikiTitle: "Melbourne" } },
  { pattern: /\bNSW\s*(State|Champ|Nats?)/i, info: { city: "Sydney", country: "Australia", wikiTitle: "Sydney" } },
  { pattern: /\bQLD\s*(State|Champ)/i, info: { city: "Brisbane", country: "Australia", wikiTitle: "Brisbane" } },
  { pattern: /\bSA\s*(State|Champ)/i, info: { city: "Adelaide", country: "Australia", wikiTitle: "Adelaide" } },
  { pattern: /\bWA\s*(State|Champ)/i, info: { city: "Perth", country: "Australia", wikiTitle: "Perth, Western Australia" } },
  { pattern: /\bUS\s*(Nats?|Open|Champ)/i, info: { city: "Long Beach, California", country: "USA", wikiTitle: "Long Beach, California" } },
  { pattern: /\bBritish\s*(Nats?|Champ)/i, info: { city: "Weymouth", country: "UK", wikiTitle: "Weymouth, Dorset" } },
  { pattern: /\bEuro(?:pean)?\s*Champ/i, info: { city: "Europe", country: "Europe", wikiTitle: "Europe" } },
  { pattern: /\bPan\s*Am(?:erican)?\b/i, info: { city: "Long Beach, California", country: "USA", wikiTitle: "Long Beach, California" } },

  // Ireland
  { pattern: /\bIrish\b/i, info: { city: "Dún Laoghaire", country: "Ireland", wikiTitle: "Dún Laoghaire" } },
  { pattern: /\bRDYC\b|\bRIYC\b/i, info: { city: "Dún Laoghaire", country: "Ireland", wikiTitle: "Dún Laoghaire" } },
  { pattern: /\bDublin\b/i, info: { city: "Dublin", country: "Ireland", wikiTitle: "Dublin" } },
  { pattern: /\bCork\b/i, info: { city: "Cork", country: "Ireland", wikiTitle: "Cork, Ireland" } },

  // Bermuda
  { pattern: /\bBermuda\b/i, info: { city: "Hamilton", country: "Bermuda", wikiTitle: "Hamilton, Bermuda" } },

  // Spain
  { pattern: /\bPrincess?a?\s+Sof[ií]a\b/i, info: { city: "Palma, Mallorca", country: "Spain", wikiTitle: "Palma, Majorca" } },
  { pattern: /\bPalma\b|\bMallorca\b/i, info: { city: "Palma, Mallorca", country: "Spain", wikiTitle: "Palma, Majorca" } },
  { pattern: /\bC[áa]diz\b/i, info: { city: "Cádiz", country: "Spain", wikiTitle: "Cádiz" } },
  { pattern: /\bBarcelona\b/i, info: { city: "Barcelona", country: "Spain", wikiTitle: "Barcelona" } },

  // France
  { pattern: /\bSemaine Olympique\b/i, info: { city: "Hyères", country: "France", wikiTitle: "Hyères" } },
  { pattern: /\bHy[èeé]res\b/i, info: { city: "Hyères", country: "France", wikiTitle: "Hyères" } },
  { pattern: /\bMarseille\b/i, info: { city: "Marseille", country: "France", wikiTitle: "Marseille" } },
  { pattern: /\bLa\s+Rochelle\b/i, info: { city: "La Rochelle", country: "France", wikiTitle: "La Rochelle" } },
  { pattern: /\bBrest\b/i, info: { city: "Brest, France", country: "France", wikiTitle: "Brest, France" } },

  // Germany
  { pattern: /\bKiel\b/i, info: { city: "Kiel", country: "Germany", wikiTitle: "Kiel" } },
  { pattern: /\bWarnem[uü]nde\b/i, info: { city: "Warnemünde", country: "Germany", wikiTitle: "Warnemünde" } },

  // Italy
  { pattern: /\bRiva\b/i, info: { city: "Riva del Garda", country: "Italy", wikiTitle: "Riva del Garda" } },
  { pattern: /\bGarda\b/i, info: { city: "Lake Garda", country: "Italy", wikiTitle: "Lake Garda" } },
  { pattern: /\bGenoa\b|\bGenova\b/i, info: { city: "Genoa", country: "Italy", wikiTitle: "Genoa" } },

  // Australia
  { pattern: /\bVic\s+State\b|\bVic\s+Champ/i, info: { city: "Melbourne", country: "Australia", wikiTitle: "Melbourne" } },
  { pattern: /\bMelb(s|ourne)?\b/i, info: { city: "Melbourne", country: "Australia", wikiTitle: "Melbourne" } },
  { pattern: /\bSydney\b/i, info: { city: "Sydney", country: "Australia", wikiTitle: "Sydney" } },
  { pattern: /\bPerth\b/i, info: { city: "Perth", country: "Australia", wikiTitle: "Perth, Western Australia" } },

  // Netherlands
  { pattern: /\bDelta\s+Lloyd\b/i, info: { city: "Medemblik", country: "Netherlands", wikiTitle: "Medemblik" } },
  { pattern: /\bMedemblik\b/i, info: { city: "Medemblik", country: "Netherlands", wikiTitle: "Medemblik" } },
  { pattern: /\bScheveningen\b/i, info: { city: "Scheveningen", country: "Netherlands", wikiTitle: "Scheveningen" } },

  // UK
  { pattern: /\bWeymouth\b/i, info: { city: "Weymouth", country: "UK", wikiTitle: "Weymouth, Dorset" } },
  { pattern: /\bPortland\b/i, info: { city: "Portland, Dorset", country: "UK", wikiTitle: "Portland, Dorset" } },

  // Portugal
  { pattern: /\bVilamoura\b/i, info: { city: "Vilamoura", country: "Portugal", wikiTitle: "Vilamoura" } },
  { pattern: /\bCascais\b/i, info: { city: "Cascais", country: "Portugal", wikiTitle: "Cascais" } },

  // USA
  { pattern: /\bLong\s+Beach\b/i, info: { city: "Long Beach, California", country: "USA", wikiTitle: "Long Beach, California" } },
  { pattern: /\bLos\s+Angeles\b/i, info: { city: "Los Angeles", country: "USA", wikiTitle: "Los Angeles" } },
  { pattern: /\bSan\s+Diego\b/i, info: { city: "San Diego", country: "USA", wikiTitle: "San Diego" } },
  { pattern: /\bMiami\b/i, info: { city: "Miami", country: "USA", wikiTitle: "Miami" } },
  { pattern: /\bClearwater\b/i, info: { city: "Clearwater, Florida", country: "USA", wikiTitle: "Clearwater, Florida" } },
  { pattern: /\bNewport\b/i, info: { city: "Newport, Rhode Island", country: "USA", wikiTitle: "Newport, Rhode Island" } },

  // Greece
  { pattern: /\bSounion\b/i, info: { city: "Cape Sounion", country: "Greece", wikiTitle: "Cape Sounion" } },
  { pattern: /\bAthens\b|\bThessaloniki\b/i, info: { city: "Athens", country: "Greece", wikiTitle: "Athens" } },

  // New Zealand
  { pattern: /\bAuckland\b/i, info: { city: "Auckland", country: "New Zealand", wikiTitle: "Auckland" } },

  // Japan
  { pattern: /\bEnoshima\b/i, info: { city: "Enoshima", country: "Japan", wikiTitle: "Enoshima" } },
  { pattern: /\bTokyo\b/i, info: { city: "Tokyo", country: "Japan", wikiTitle: "Tokyo" } },

  // Malta
  { pattern: /\bMalta\b|\bSailCoach\b/i, info: { city: "Valletta", country: "Malta", wikiTitle: "Valletta" } },

  // Argentina
  { pattern: /\bMar\s+del\s+Plata\b/i, info: { city: "Mar del Plata", country: "Argentina", wikiTitle: "Mar del Plata" } },
  { pattern: /\bBuenos\s+Aires\b/i, info: { city: "Buenos Aires", country: "Argentina", wikiTitle: "Buenos Aires" } },

  // Finland
  { pattern: /\bHelsinki\b/i, info: { city: "Helsinki", country: "Finland", wikiTitle: "Helsinki" } },
  { pattern: /\bP[uo]hri?niemi\b/i, info: { city: "Helsinki", country: "Finland", wikiTitle: "Helsinki" } },

  // Estonia
  { pattern: /\bTallinn\b/i, info: { city: "Tallinn", country: "Estonia", wikiTitle: "Tallinn" } },

  // Denmark
  { pattern: /\bAarhus\b|\bÅrhus\b/i, info: { city: "Aarhus", country: "Denmark", wikiTitle: "Aarhus" } },

  // Poland
  { pattern: /\bGda[ńn]sk\b/i, info: { city: "Gdańsk", country: "Poland", wikiTitle: "Gdańsk" } },
  { pattern: /\bGdynia\b/i, info: { city: "Gdynia", country: "Poland", wikiTitle: "Gdynia" } },

  // Croatia
  { pattern: /\bMedulin\b/i, info: { city: "Medulin", country: "Croatia", wikiTitle: "Medulin" } },
  { pattern: /\bPula\b/i, info: { city: "Pula", country: "Croatia", wikiTitle: "Pula, Croatia" } },
  { pattern: /\bTrogir\b/i, info: { city: "Trogir", country: "Croatia", wikiTitle: "Trogir" } },
  { pattern: /\bSplit\b/i, info: { city: "Split", country: "Croatia", wikiTitle: "Split, Croatia" } },

  // France (additional)
  { pattern: /\bCarnac\b/i, info: { city: "Carnac", country: "France", wikiTitle: "Carnac, Brittany" } },
  { pattern: /\bLa\s+Grande[- ]Motte\b/i, info: { city: "La Grande-Motte", country: "France", wikiTitle: "La Grande-Motte" } },
  { pattern: /\bQuiberon\b/i, info: { city: "Quiberon", country: "France", wikiTitle: "Quiberon" } },

  // UK (additional)
  { pattern: /\bLymington\b/i, info: { city: "Lymington", country: "UK", wikiTitle: "Lymington" } },

  // Oman
  { pattern: /\bMussanah\b|\bOman\b/i, info: { city: "Mussanah", country: "Oman", wikiTitle: "Oman" } },

  // Brazil
  { pattern: /\bFortaleza\b/i, info: { city: "Fortaleza", country: "Brazil", wikiTitle: "Fortaleza" } },
  { pattern: /\bRecife\b/i, info: { city: "Recife", country: "Brazil", wikiTitle: "Recife" } },
  { pattern: /\bSalvador\b/i, info: { city: "Salvador", country: "Brazil", wikiTitle: "Salvador, Bahia" } },
  { pattern: /\bFlorianóp?olis\b/i, info: { city: "Florianópolis", country: "Brazil", wikiTitle: "Florianópolis" } },
];

export function lookupVenue(title: string, startDate?: string): VenueInfo | null {
  const year = startDate ? parseInt(startDate.slice(0, 4), 10) : null;
  for (const { pattern, info, years } of VENUES) {
    if (!pattern.test(title)) continue;
    if (years && year !== null && (year < years[0] || year > years[1])) continue;
    return info;
  }
  return null;
}

export function buildILCASearchQuery(
  title: string,
  startDate: string,
): string {
  const year = startDate.slice(0, 4);
  const month = new Date(`${startDate}T00:00:00`).toLocaleString("en", {
    month: "long",
  });
  return `ILCA 7 Regatta "${title}" ${month} ${year}`;
}
