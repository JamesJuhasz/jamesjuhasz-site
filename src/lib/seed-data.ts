/*
  Day 2-4 seed data. Hardcoded until Day 5 wires Sanity CMS.
  Structure mirrors the planned Sanity schemas — switching to GROQ
  later swaps these arrays for fetches without changing call sites.
*/

export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: string;
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
  coverImage?: string;
};

export type SeedPress = {
  publication: string;
  articleTitle: string;
  publishedAt: string;
  externalUrl: string;
  excerpt?: string;
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
  },
  {
    slug: "off-to-australia",
    title: "Off to Australia",
    excerpt:
      "Big southern hemisphere block — three weeks at Sail Sydney plus a coaching camp on the Gold Coast.",
    publishedAt: "2026-02-04",
    tags: ["training", "australia"],
  },
  {
    slug: "reflecting-on-3-months-of-racing",
    title: "Reflecting on three months of racing",
    excerpt:
      "Top-30 finish at Worlds, a podium at Princesa Sofia, and the things that came up short.",
    publishedAt: "2026-01-08",
    tags: ["regatta", "results"],
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
  },
  {
    publication: "Oakville Beaver",
    articleTitle: "From the Great Lakes to LA 2028: a hometown Olympic bid",
    publishedAt: "2025-09-02",
    externalUrl: "https://www.insidehalton.com",
    excerpt:
      "Profile on James's path from junior sailing at Oakville Yacht Squadron to a year-round international campaign.",
  },
  {
    publication: "World Sailing",
    articleTitle: "Top-30 finish at Princesa Sofía — Canadian breakout",
    publishedAt: "2026-04-05",
    externalUrl: "https://www.sailing.org",
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
