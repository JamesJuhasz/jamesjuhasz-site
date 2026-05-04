/*
  Day 2-4 seed data. Hardcoded until Day 5 wires Sanity CMS.
  Structure mirrors the planned Sanity schemas — switching to GROQ
  later swaps these arrays for fetches without changing call sites.
*/

export type CoverImage = {
  asset: { url: string };
  alt?: string;
};

const cover = (url: string, alt?: string): CoverImage => ({
  asset: { url },
  alt,
});

export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: CoverImage;
  tags: string[];
};

export type SeedEvent = {
  slug: string;
  title: string;
  eventDate: string;
  endDate?: string;
  location: string;
  category: "Regatta" | "Training" | "Coaching";
  resultPosition?: string;
  status: "upcoming" | "recent" | "past";
  excerpt: string;
  coverImage?: CoverImage;
};

export type SeedPress = {
  publication: string;
  articleTitle: string;
  publishedAt: string;
  externalUrl: string;
  excerpt?: string;
  imageUrl?: string;
  /** True when James is the primary subject of the article. */
  featured?: boolean;
};

export type GivingLevel = {
  amount: number;
  label: string;
  outcome: string;
  monthly?: boolean;
};

export const trainingStats = [
  { value: 203, label: "Days on the water" },
  { value: 144, label: "Gym sessions" },
  { value: 2762, label: "Cycling km" },
  { value: 10352, label: "Km driven" },
] as const;

export const givingLevels: GivingLevel[] = [
  {
    amount: 50,
    label: "Day on the water",
    outcome: "One day of training in Europe — coach time, RIB fuel, launch fees.",
  },
  {
    amount: 250,
    label: "Regatta entry",
    outcome: "Entry fee for an international regatta — qualifying points on the line.",
  },
  {
    amount: 1000,
    label: "A month in Malta",
    outcome: "A month of housing in Malta — based at SailCoach, training year-round.",
  },
];

export const recentPosts: SeedPost[] = [
  {
    slug: "a-month-in-lake-garda",
    title: "A month in Lake Garda",
    excerpt:
      "Four weeks dialing the boat in shifty alpine winds. Hard, fast, useful — and a step closer to qualifying.",
    publishedAt: "2026-04-12",
    tags: ["training", "italy"],
    coverImage: cover("/images/hero-candidates/IMG_9100.jpg", "Lake Garda training day"),
  },
  {
    slug: "off-to-australia",
    title: "Off to Australia",
    excerpt:
      "Big southern hemisphere block — three weeks at Sail Sydney plus a coaching camp on the Gold Coast.",
    publishedAt: "2026-02-04",
    tags: ["training", "australia"],
    coverImage: cover("/images/hero-candidates/IMG_9128.jpg", "Off to Australia for the southern hemisphere block"),
  },
  {
    slug: "reflecting-on-3-months-of-racing",
    title: "Reflecting on three months of racing",
    excerpt:
      "Top-30 finish at Worlds, a podium at Princesa Sofia, and the things that came up short.",
    publishedAt: "2026-01-08",
    tags: ["regatta", "results"],
    coverImage: cover(
      "/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1922-edit-2_(2).jpg",
      "Trofeo Princesa Sofía race day",
    ),
  },
];

export const allEvents: SeedEvent[] = [
  {
    slug: "trofeo-princesa-sofia-2026",
    title: "Trofeo Princesa Sofía",
    eventDate: "2026-03-29",
    endDate: "2026-04-04",
    location: "Palma de Mallorca, Spain",
    category: "Regatta",
    status: "recent",
    resultPosition: "12th",
    excerpt:
      "Olympic-class regatta in Mallorca — 130-boat ILCA 7 fleet. Strong final day moved me into the gold fleet.",
    coverImage: cover("/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1927-edit-2_(2).jpg"),
  },
  {
    slug: "winter-camp-malta-2026",
    title: "Winter training block — Malta",
    eventDate: "2026-01-08",
    endDate: "2026-03-15",
    location: "Marsamxett Harbour, Malta",
    category: "Training",
    status: "recent",
    excerpt:
      "Ten weeks based with SailCoach. Stable Mediterranean breeze and a deep training group.",
    coverImage: cover("/images/hero-candidates/dsc02709.jpg"),
  },
  {
    slug: "ilca-7-worlds-2026",
    title: "ILCA 7 Men's World Championship",
    eventDate: "2026-06-14",
    endDate: "2026-06-22",
    location: "Aarhus, Denmark",
    category: "Regatta",
    status: "upcoming",
    excerpt:
      "The big one. Olympic qualifying weight, deep fleet, choppy North Sea conditions.",
    coverImage: cover("/images/hero-candidates/dsc09574.jpg"),
  },
  {
    slug: "kiel-week-2026",
    title: "Kieler Woche",
    eventDate: "2026-06-23",
    endDate: "2026-06-30",
    location: "Kiel, Germany",
    category: "Regatta",
    status: "upcoming",
    excerpt:
      "Back-to-back with Worlds. Tight turnaround, big-fleet sailing in the Baltic.",
    coverImage: cover("/images/hero-candidates/dsc09641.jpg"),
  },
  {
    slug: "sail-sydney-2026",
    title: "Sail Sydney",
    eventDate: "2026-12-12",
    endDate: "2026-12-18",
    location: "Sydney, Australia",
    category: "Regatta",
    status: "upcoming",
    excerpt:
      "Hot southern hemisphere ahead of LA 2028. Strong sea breeze, big swell, technical course.",
    coverImage: cover("/images/hero-candidates/dsc04465.jpg"),
  },
  {
    slug: "fall-block-2025-toronto",
    title: "Fall block — Toronto",
    eventDate: "2025-09-05",
    endDate: "2025-11-30",
    location: "Oakville Yacht Squadron, ON",
    category: "Training",
    status: "past",
    excerpt:
      "Home club sessions. Hiking volume, fitness base, and rig tuning before heading south.",
    coverImage: cover("/images/hero-candidates/img_8859.jpg"),
  },
  {
    slug: "miami-orc-2026",
    title: "Miami Olympic Classes Regatta",
    eventDate: "2026-01-30",
    endDate: "2026-02-04",
    location: "Coconut Grove, FL",
    category: "Regatta",
    status: "recent",
    resultPosition: "18th",
    excerpt:
      "First international regatta of the year. Lighter conditions than expected — boat speed work paid off.",
    coverImage: cover("/images/hero-candidates/dsc09449.jpg"),
  },
];

export const pressEntries: SeedPress[] = [
  {
    publication: "Sail Canada",
    articleTitle: "Juhasz named to Canadian Sailing Team for 2026 cycle",
    publishedAt: "2025-11-14",
    externalUrl: "https://www.sailing.ca",
    excerpt:
      "Selection puts him among the top male ILCA 7 athletes in the country, with full national-team support.",
    featured: true,
  },
  {
    publication: "Oakville Beaver",
    articleTitle: "From the Great Lakes to LA 2028: a hometown Olympic bid",
    publishedAt: "2025-09-02",
    externalUrl: "https://www.insidehalton.com",
    excerpt:
      "Profile on James's path from junior sailing at Oakville Yacht Squadron to a year-round international campaign.",
    featured: true,
  },
  {
    publication: "World Sailing",
    articleTitle: "Top-30 finish at Princesa Sofía — Canadian breakout",
    publishedAt: "2026-04-05",
    externalUrl: "https://www.sailing.org",
    featured: true,
  },
];

export const careerTimeline = [
  {
    year: "2007",
    title: "Onto the lake",
    location: "Lake Ontario",
    body: "First time on the water in my parents' boat. Every weekend exploring the lake with my sister.",
  },
  {
    year: "2014–2018",
    title: "Junior sailing",
    location: "Oakville Yacht Squadron",
    body: "Optimist, then ILCA 4. Regional regattas, North American championships, and a slow obsession.",
  },
  {
    year: "2019",
    title: "Stepping into the ILCA 7",
    location: "Florida + Ontario",
    body: "Move into the Olympic-class boat. Heavier rig, longer races, professional coaching.",
  },
  {
    year: "2020",
    title: "Quarantine on the lake",
    location: "Oakville, ON",
    body: "Pandemic shut down racing. Trained alone for a year — the long hours that compounded later.",
  },
  {
    year: "2021",
    title: "Move to Malta",
    location: "Marsamxett Harbour",
    body: "Joined SailCoach in Malta full-time. International training group, year-round Mediterranean breeze.",
  },
  {
    year: "2024",
    title: "Named to Canadian Sailing Team",
    location: "Canada",
    body: "Selected to the national squad for the LA 2028 cycle. Funded coaching, performance support, full-time campaign.",
  },
  {
    year: "2026 →",
    title: "Olympic qualifying window",
    location: "Worldwide",
    body: "World Championships, continental qualifiers, and the start line at LA 2028.",
  },
] as const;

export const aboutStats = [
  { value: 19, suffix: "+", label: "Years sailing" },
  { value: 12, label: "Countries trained in" },
  { value: 365, label: "Training days per year" },
  { value: 2028, label: "LA Olympics" },
];

/* ---------------------------------------------------------------------------
   Race results — historical race log for /results.
   ---------------------------------------------------------------------------
   Shape mirrors `Result` in src/lib/results.ts (with `_guessed: true` marking
   any placement that was estimated rather than verified). Wire-up: the
   results pipeline can read this via `seedResults` as an additional manual
   overlay layer, OR drop it in as a fallback when the CoachAible API is
   unavailable.

   Pattern used for guesses (LA28-track Canadian, junior→senior transition):
     - National (CAN): top 5
     - North American: top 10
     - Senior continental Europeans: 30–50
     - Senior World Championships: 50–80 (early appearances)
     - Junior Worlds (earlier years): 15–30
     - Learning-curve: deeper fleets earlier, sharper results later
     - NO invented podiums. Honest zeros beat fake podiums.

   IMPORTANT FOR REVIEW: every entry with `_guessed: true` is an estimate.
   Replace with actual placement on review.
-------------------------------------------------------------------------- */

export type SeedResult = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  /** ISO 3166-1 alpha-3 or short country name; null when unknown. */
  country: string | null;
  /** Final placement, e.g. "12" or "12th". null = result not yet known. */
  position: string | null;
  totalCompetitors: number | null;
  fleet: string | null;
  externalUrl: string | null;
  source: string | null;
  coverImage?: CoverImage;
  excerpt?: string;
  /** Slug into /events/[slug] when a diary entry exists. */
  slug?: string;
  location?: string;
  /** True when `position` is an estimate, not a verified result. */
  _guessed?: boolean;
};

export const seedResults: SeedResult[] = [
  // 2026 — senior international debut block. Two known results from `allEvents`
  // (Trofeo 12th, Miami 18th) — kept here as the canonical results-page record.
  {
    id: "result-trofeo-sofia-2026",
    title: "Trofeo Princesa Sofía",
    startDate: "2026-03-29",
    endDate: "2026-04-04",
    country: "ESP",
    position: "12",
    totalCompetitors: 130,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    coverImage: cover(
      "/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1927-edit-2_(2).jpg",
    ),
    slug: "trofeo-princesa-sofia-2026",
    location: "Palma de Mallorca, Spain",
  },
  {
    id: "result-miami-orc-2026",
    title: "Miami Olympic Classes Regatta",
    startDate: "2026-01-30",
    endDate: "2026-02-04",
    country: "USA",
    position: "18",
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    coverImage: cover("/images/hero-candidates/dsc09449.jpg"),
    slug: "miami-orc-2026",
    location: "Coconut Grove, FL",
  },
  // GUESSED entries below — placements estimated against the pattern above.
  {
    id: "result-canadian-championships-2025",
    title: "Canadian ILCA Championships",
    startDate: "2025-08-15",
    endDate: "2025-08-19",
    country: "CAN",
    position: "3", // GUESS — national, on the team, top-5 expected
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Kingston, ON",
    _guessed: true,
  },
  {
    id: "result-north-americans-2025",
    title: "ILCA 7 North American Championships",
    startDate: "2025-07-10",
    endDate: "2025-07-13",
    country: "USA",
    position: "8", // GUESS — North American, top-10 typical for CST sailor
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Newport, RI",
    _guessed: true,
  },
  {
    id: "result-kiel-week-2025",
    title: "Kieler Woche",
    startDate: "2025-06-21",
    endDate: "2025-06-29",
    country: "DEU",
    position: "38", // GUESS — senior continental European, 30–50 range
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Kiel, Germany",
    _guessed: true,
  },
  {
    id: "result-worlds-2025",
    title: "ILCA 7 Men's World Championship",
    startDate: "2025-06-10",
    endDate: "2025-06-18",
    country: "GBR",
    position: "62", // GUESS — senior worlds, early appearance, 50–80 range
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Weymouth, UK",
    _guessed: true,
  },
  {
    id: "result-europeans-2025",
    title: "ILCA 7 European Championship",
    startDate: "2025-05-04",
    endDate: "2025-05-11",
    country: "GRC",
    position: "44", // GUESS — senior Europeans, 30–50 range
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Athens, Greece",
    _guessed: true,
  },
  {
    id: "result-trofeo-sofia-2025",
    title: "Trofeo Princesa Sofía",
    startDate: "2025-03-29",
    endDate: "2025-04-05",
    country: "ESP",
    position: "47", // GUESS — first senior Sofía, deeper than 2026's 12th
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Palma de Mallorca, Spain",
    _guessed: true,
  },
  {
    id: "result-miami-orc-2025",
    title: "Miami Olympic Classes Regatta",
    startDate: "2025-01-28",
    endDate: "2025-02-02",
    country: "USA",
    position: "26", // GUESS — first senior Miami, deeper than 2026's 18th
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Coconut Grove, FL",
    _guessed: true,
  },
  {
    id: "result-canadian-championships-2024",
    title: "Canadian ILCA Championships",
    startDate: "2024-08-16",
    endDate: "2024-08-20",
    country: "CAN",
    position: "5", // GUESS — national, top-5
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Halifax, NS",
    _guessed: true,
  },
  {
    id: "result-north-americans-2024",
    title: "ILCA 7 North American Championships",
    startDate: "2024-07-12",
    endDate: "2024-07-15",
    country: "CAN",
    position: "10", // GUESS — North American, top-10 boundary
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Toronto, ON",
    _guessed: true,
  },
  {
    id: "result-kiel-week-2024",
    title: "Kieler Woche",
    startDate: "2024-06-22",
    endDate: "2024-06-30",
    country: "DEU",
    position: "52", // GUESS — first senior Kiel, slightly deeper
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Kiel, Germany",
    _guessed: true,
  },
  {
    id: "result-junior-worlds-2024",
    title: "ILCA 7 Youth & Junior World Championship",
    startDate: "2024-07-22",
    endDate: "2024-07-29",
    country: "POL",
    position: "22", // GUESS — junior worlds, 15–30 range (older year)
    totalCompetitors: null,
    fleet: "ILCA 7 Junior",
    externalUrl: null,
    source: null,
    location: "Gdynia, Poland",
    _guessed: true,
  },
  {
    id: "result-trofeo-sofia-2024",
    title: "Trofeo Princesa Sofía",
    startDate: "2024-04-01",
    endDate: "2024-04-06",
    country: "ESP",
    position: "68", // GUESS — early senior Sofía, deeper learning-curve start
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Palma de Mallorca, Spain",
    _guessed: true,
  },
  {
    id: "result-junior-worlds-2023",
    title: "ILCA 7 Youth World Championship",
    startDate: "2023-07-15",
    endDate: "2023-07-22",
    country: "GRC",
    position: "28", // GUESS — junior worlds, deeper into 15–30 range earlier on
    totalCompetitors: null,
    fleet: "ILCA 7 Junior",
    externalUrl: null,
    source: null,
    location: "Patras, Greece",
    _guessed: true,
  },
  {
    id: "result-canadian-championships-2023",
    title: "Canadian ILCA Championships",
    startDate: "2023-08-18",
    endDate: "2023-08-22",
    country: "CAN",
    position: "4", // GUESS — national, top-5
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Vancouver, BC",
    _guessed: true,
  },
  {
    id: "result-cork-week-2022",
    title: "CORK Olympic Classes Regatta",
    startDate: "2022-08-13",
    endDate: "2022-08-19",
    country: "CAN",
    position: "6", // GUESS — Canadian regional, top-10
    totalCompetitors: null,
    fleet: "ILCA 7",
    externalUrl: null,
    source: null,
    location: "Kingston, ON",
    _guessed: true,
  },
];
