/*
  Gallery sub-collection seed (Day 3). Names mirror the Squarespace folders
  in ./squarespace-backup/all-images/. Real photos land Day 7 via Sanity.
*/

export type Gallery = {
  slug: string;
  title: string;
  dateRange: string;
  context?: string;
  photoCount: number;
  /** Short tone hint for the placeholder card gradient (Day 3 only). */
  toneHue?: number;
};

export const galleries: Gallery[] = [
  {
    slug: "malta-summer-2020",
    title: "Malta — Summer 2020",
    dateRange: "Jun – Sep 2020",
    context: "First Mediterranean season at SailCoach.",
    photoCount: 64,
    toneHue: 210,
  },
  {
    slug: "malta-winter-202021",
    title: "Malta — Winter 2020/21",
    dateRange: "Oct 2020 – Mar 2021",
    context: "Year-round breeze, deep training group.",
    photoCount: 81,
    toneHue: 220,
  },
  {
    slug: "spring-2020",
    title: "Spring 2020",
    dateRange: "Mar – May 2020",
    context: "Pre-COVID training in Florida.",
    photoCount: 48,
    toneHue: 35,
  },
  {
    slug: "spring-2021",
    title: "Spring 2021",
    dateRange: "Mar – May 2021",
    context: "Lake Garda with the international squad.",
    photoCount: 53,
    toneHue: 195,
  },
  {
    slug: "fall-2020",
    title: "Fall 2020",
    dateRange: "Sep – Nov 2020",
    context: "First fall block on the Mediterranean.",
    photoCount: 41,
    toneHue: 25,
  },
  {
    slug: "fall-2021",
    title: "Fall 2021",
    dateRange: "Sep – Nov 2021",
    context: "Pre-Worlds preparation block.",
    photoCount: 67,
    toneHue: 15,
  },
  {
    slug: "uk-summer-2021",
    title: "UK — Summer 2021",
    dateRange: "Jun – Aug 2021",
    context: "European championships circuit.",
    photoCount: 55,
    toneHue: 200,
  },
  {
    slug: "winter-202122",
    title: "Winter 2021/22",
    dateRange: "Dec 2021 – Feb 2022",
    context: "Quiet block — boat speed and rig work.",
    photoCount: 39,
    toneHue: 215,
  },
  {
    slug: "spring-2022",
    title: "Spring 2022",
    dateRange: "Mar – May 2022",
    context: "Princesa Sofía, Hyères, Allianz.",
    photoCount: 72,
    toneHue: 190,
  },
  {
    slug: "summer-2022",
    title: "Summer 2022",
    dateRange: "Jun – Aug 2022",
    context: "Worlds in Texas + European training.",
    photoCount: 88,
    toneHue: 30,
  },
  {
    slug: "fall2022",
    title: "Fall 2022",
    dateRange: "Sep – Nov 2022",
    context: "Hyères + warm-up regattas.",
    photoCount: 60,
    toneHue: 20,
  },
  {
    slug: "spring-2023",
    title: "Spring 2023",
    dateRange: "Mar – May 2023",
    context: "Princesa Sofía and a strong Trofeo block.",
    photoCount: 75,
    toneHue: 205,
  },
  {
    slug: "2017-2018-2019",
    title: "Junior years — 2017 to 2019",
    dateRange: "2017 – 2019",
    context: "ILCA 4 then ILCA 7 transition. Junior fleets, learning years.",
    photoCount: 95,
    toneHue: 45,
  },
];

export function getGallery(slug: string) {
  return galleries.find((g) => g.slug === slug);
}
