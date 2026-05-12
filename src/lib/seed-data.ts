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

export const pressEntries: SeedPress[] = [];

export const careerTimeline = [
  {
    year: "2007",
    title: "Onto the lake",
    location: "Lake Ontario",
    body: "First time on the water in my parents' boat. Every weekend exploring the lake with my sister.",
    image: "/images/about/childhood-steering-sister.jpg",
    results: [] as readonly string[],
  },
  {
    year: "2009–2011",
    title: "BHYC Sailing School",
    location: "Bronte Harbour · Oakville",
    body: "Learn-to-sail in Optimists at Bronte Harbour Yacht Club. First feel for racing dinghies.",
    image: "/images/about/junior-sailing-school.jpg",
    results: [] as readonly string[],
  },
  {
    year: "2011–2015",
    title: "BHYC Race Team",
    location: "Bronte Harbour · Oakville",
    body: "Started in club 420's, then moved into Laser Radial in 2012. First taste of true competitive racing.",
    image: "/images/about/junior-laser-team.jpg",
    results: [] as readonly string[],
  },
  {
    year: "2015–2019",
    title: "Ontario Sailing Team",
    location: "Ontario · Florida",
    body: "Selected to the provincial high-performance squad at 16. Winters in Florida, summers on Lake Ontario, first international events under the Canadian flag.",
    image: "/images/about/youth-ontario-team.jpg",
    results: [
      "2nd · Ontario Summer Games — 2016",
    ] as readonly string[],
  },
  {
    year: "2017",
    title: "Stepping into the ILCA 7",
    location: "Florida + Ontario",
    body: "Move into the Olympic-class boat.",
    image: "/images/section/03.jpg",
    results: [
      "4th · North American ILCA Championships — 2019",
      "2nd · Canadian Championships — 2019",
      "Sail Canada Developing Sailor of the Year — 2019",
    ] as readonly string[],
  },
  {
    year: "2017–2020",
    title: "Queen's Sailing Team",
    location: "Kingston, ON",
    body: "Helped lead Queen's to two National Championship titles. VP of Operations in my final year — running tryouts, regattas, and team logistics.",
    image: "/images/about/queens-sailing.jpg",
    results: [
      "1st · Canadian Collegiate Championships — 2017",
    ] as readonly string[],
  },
  {
    year: "2020",
    title: "Quarantine on the lake",
    location: "Oakville, ON",
    body: "Pandemic shut down racing.",
    image: "/images/section/02.jpg",
    results: [] as readonly string[],
  },
  {
    year: "2020–2022",
    title: "Move to Malta",
    location: "Marsamxett Harbour",
    body: "Joined the Sailcoach senior team full-time under Alex Denisuic. Lived in Malta year-round, devoted to the study of sailing.",
    image: "/images/about/malta-portrait.jpg",
    results: [] as readonly string[],
  },
  {
    year: "2022 →",
    title: "Named to Canadian Sailing Team",
    location: "Canada",
    body: "Selected to the national squad. Two Olympic campaigns in the ILCA 7, hunting for North American, Grand Slam, and World Championship medals.",
    image: "/images/about/malta-racing.jpg",
    results: [
      "Peak world ranking · 32nd",
      "37th · ILCA World Championships — 2025",
      "1st · Canadian ILCA Championships — 2024",
      "2nd · North American ILCA Championships — 2024",
      "3rd · North American ILCA Championships — 2022",
    ] as readonly string[],
  },
  {
    year: "2026 →",
    title: "Olympic qualifying window",
    location: "Worldwide",
    body: "World Championships, continental qualifiers, and the start line at LA 2028.",
    image: "/images/hero-candidates/260326_sailingenergy_trofeo-sofia_pm1_1927-edit-2_(2).jpg",
    results: [] as readonly string[],
  },
] as const;

export const aboutStats = [
  { value: 19, suffix: "+", label: "Years sailing" },
  { value: 15, label: "Countries trained in" },
  { value: 2028, label: "LA Olympics" },
];

/* ---------------------------------------------------------------------------
   Past race results live in src/data/world-sailing-events.json (verified from
   the World Sailing federation profile) and are loaded via
   src/lib/world-sailing.ts. The previous `seedResults` array — which contained
   manually estimated placements — was deleted on 2026-05-04: every published
   result must trace to a verified source.
-------------------------------------------------------------------------- */
