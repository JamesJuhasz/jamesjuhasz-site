/*
  Gallery sub-collections, mirroring jamesjuhasz.com — most recent first.
  Photos live in /public/images/galleries/<slug>/photo-NN.<ext>; all photos
  from the original Squarespace galleries are included in original order.
*/

export type Gallery = {
  slug: string;
  title: string;
  dateRange: string;
  context?: string;
  /** Total photos in this gallery (matches files on disk). */
  photoCount: number;
  /** Cover photo path (in /public). */
  coverImage: string;
  /** Tone hint kept for legacy use; no longer drives placeholder gradients. */
  toneHue?: number;
  /** Ordered photo list shown on the detail page. */
  photos: string[];
};

const photo = (slug: string, n: number, ext: "jpg" | "png" = "jpg") =>
  `/images/galleries/${slug}/photo-${String(n).padStart(2, "0")}.${ext}`;

const seq = (slug: string, count = 16, ext: "jpg" | "png" = "jpg") =>
  Array.from({ length: count }, (_, i) => photo(slug, i + 1, ext));

export const galleries: Gallery[] = [
  {
    slug: "spring-2023",
    title: "Spring 2023",
    dateRange: "Mar – May 2023",
    context: "Princesa Sofía and a strong Trofeo block.",
    photoCount: 45,
    coverImage: photo("spring-2023", 1),
    toneHue: 205,
    photos: seq("spring-2023", 45),
  },
  {
    slug: "winter-202223",
    title: "Winter 2022/23",
    dateRange: "Dec 2022 – Feb 2023",
    context: "Off-season training between blocks.",
    photoCount: 16,
    coverImage: photo("winter-202223", 1, "png"),
    toneHue: 220,
    photos: seq("winter-202223", 16, "png"),
  },
  {
    slug: "fall2022",
    title: "Fall 2022",
    dateRange: "Sep – Nov 2022",
    context: "Hyères + warm-up regattas.",
    photoCount: 107,
    coverImage: photo("fall2022", 1),
    toneHue: 20,
    photos: seq("fall2022", 107),
  },
  {
    slug: "summer-2022",
    title: "Summer 2022",
    dateRange: "Jun – Aug 2022",
    context: "Worlds in Texas + European training.",
    photoCount: 51,
    coverImage: photo("summer-2022", 1),
    toneHue: 30,
    photos: seq("summer-2022", 51),
  },
  {
    slug: "spring-2022",
    title: "Spring 2022",
    dateRange: "Mar – May 2022",
    context: "Princesa Sofía, Hyères, Allianz.",
    photoCount: 28,
    coverImage: photo("spring-2022", 1),
    toneHue: 190,
    photos: seq("spring-2022", 28),
  },
  {
    slug: "winter-202122",
    title: "Winter 2021/22",
    dateRange: "Dec 2021 – Feb 2022",
    context: "Quiet block — boat speed and rig work.",
    photoCount: 29,
    coverImage: photo("winter-202122", 1),
    toneHue: 215,
    photos: seq("winter-202122", 29),
  },
  {
    slug: "fall-2021",
    title: "Fall 2021",
    dateRange: "Sep – Nov 2021",
    context: "Pre-Worlds preparation block.",
    photoCount: 44,
    coverImage: photo("fall-2021", 1),
    toneHue: 15,
    photos: seq("fall-2021", 44),
  },
  {
    slug: "summer-2021",
    title: "Summer 2021",
    dateRange: "Jun – Aug 2021",
    context: "European championships circuit.",
    photoCount: 41,
    coverImage: photo("summer-2021", 1),
    toneHue: 200,
    photos: seq("summer-2021", 41),
  },
  {
    slug: "spring-2021",
    title: "Spring 2021",
    dateRange: "Mar – May 2021",
    context: "Lake Garda with the international squad.",
    photoCount: 18,
    coverImage: photo("spring-2021", 1),
    toneHue: 195,
    photos: seq("spring-2021", 18),
  },
  {
    slug: "winter-202021",
    title: "Winter 2020/21",
    dateRange: "Dec 2020 – Feb 2021",
    context: "Year-round breeze, deep training group.",
    photoCount: 26,
    coverImage: photo("winter-202021", 1),
    toneHue: 220,
    photos: seq("winter-202021", 26),
  },
  {
    slug: "fall-2020",
    title: "Fall 2020",
    dateRange: "Sep – Nov 2020",
    context: "First fall block on the Mediterranean.",
    photoCount: 52,
    coverImage: photo("fall-2020", 1),
    toneHue: 25,
    photos: seq("fall-2020", 52),
  },
  {
    slug: "summer-2020",
    title: "Summer 2020",
    dateRange: "Jun – Aug 2020",
    context: "First Mediterranean season at SailCoach.",
    photoCount: 58,
    coverImage: photo("summer-2020", 1),
    toneHue: 210,
    photos: seq("summer-2020", 58),
  },
  {
    slug: "spring-2020",
    title: "Spring 2020",
    dateRange: "Mar – May 2020",
    context: "Pre-COVID training in Florida.",
    photoCount: 24,
    coverImage: photo("spring-2020", 1),
    toneHue: 35,
    photos: seq("spring-2020", 24),
  },
  {
    slug: "junior-years",
    title: "2017, 2018, 2019",
    dateRange: "2017 – 2019",
    context: "ILCA 4 then ILCA 7 transition. Junior fleets, learning years.",
    photoCount: 35,
    coverImage: photo("junior-years", 1),
    toneHue: 45,
    photos: seq("junior-years", 35),
  },
];

/** Photos for a gallery's detail page. */
export function photosForGallery(slug: string): string[] {
  const g = galleries.find((x) => x.slug === slug);
  return g ? g.photos : [];
}

export function getGallery(slug: string) {
  return galleries.find((g) => g.slug === slug);
}
