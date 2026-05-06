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
    amount: 10,
    label: "Get James a Coffee",
    outcome: "Fuel for the 5 AM training sessions. Small but it adds up.",
    monthly: true,
  },
  {
    amount: 50,
    label: "Get James a Gym Membership",
    outcome: "One month of land training — strength, cardio, and conditioning.",
    monthly: true,
  },
  {
    amount: 250,
    label: "Get James a Day of Coaching",
    outcome: "A full day on the water — coach time, RIB fuel, and real-time feedback.",
    monthly: true,
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

/* `allEvents` has been removed. Past events come from World Sailing
   (src/lib/world-sailing.ts → getWorldSailingPastEvents); upcoming events
   come from CoachAible at the page level. Sanity will replace both fallbacks
   once Day 5 wires the CMS in. */

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
    year: "2022",
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
  { value: 15, label: "Countries trained in" },
  { value: 365, label: "Training days per year" },
  { value: 2028, label: "LA Olympics" },
];

/* ---------------------------------------------------------------------------
   Past race results live in src/data/world-sailing-events.json (verified from
   the World Sailing federation profile) and are loaded via
   src/lib/world-sailing.ts. The previous `seedResults` array — which contained
   manually estimated placements — was deleted on 2026-05-04: every published
   result must trace to a verified source.
-------------------------------------------------------------------------- */
