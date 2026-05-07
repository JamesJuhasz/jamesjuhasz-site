/*
  One-time seed: imports the 14 legacy galleries (slugs + metadata previously
  hardcoded in src/lib/galleries.ts) and the photo files in
  public/images/galleries/<slug>/ into Postgres.

  Idempotent: skips galleries whose slug already exists.

  Run: npm run seed:galleries
*/
import { readdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

type Seed = {
  slug: string;
  title: string;
  dateRange: string;
  context: string;
  ext: "jpg" | "png";
};

const SEEDS: Seed[] = [
  { slug: "spring-2023", title: "Spring 2023", dateRange: "Mar – May 2023", context: "Princesa Sofía and a strong Trofeo block.", ext: "jpg" },
  { slug: "winter-202223", title: "Winter 2022/23", dateRange: "Dec 2022 – Feb 2023", context: "Off-season training between blocks.", ext: "png" },
  { slug: "fall2022", title: "Fall 2022", dateRange: "Sep – Nov 2022", context: "Hyères + warm-up regattas.", ext: "jpg" },
  { slug: "summer-2022", title: "Summer 2022", dateRange: "Jun – Aug 2022", context: "Worlds in Texas + European training.", ext: "jpg" },
  { slug: "spring-2022", title: "Spring 2022", dateRange: "Mar – May 2022", context: "Princesa Sofía, Hyères, Allianz.", ext: "jpg" },
  { slug: "winter-202122", title: "Winter 2021/22", dateRange: "Dec 2021 – Feb 2022", context: "Quiet block — boat speed and rig work.", ext: "jpg" },
  { slug: "fall-2021", title: "Fall 2021", dateRange: "Sep – Nov 2021", context: "Pre-Worlds preparation block.", ext: "jpg" },
  { slug: "summer-2021", title: "Summer 2021", dateRange: "Jun – Aug 2021", context: "European championships circuit.", ext: "jpg" },
  { slug: "spring-2021", title: "Spring 2021", dateRange: "Mar – May 2021", context: "Lake Garda with the international squad.", ext: "jpg" },
  { slug: "winter-202021", title: "Winter 2020/21", dateRange: "Dec 2020 – Feb 2021", context: "Year-round breeze, deep training group.", ext: "jpg" },
  { slug: "fall-2020", title: "Fall 2020", dateRange: "Sep – Nov 2020", context: "First fall block on the Mediterranean.", ext: "jpg" },
  { slug: "summer-2020", title: "Summer 2020", dateRange: "Jun – Aug 2020", context: "First Mediterranean season at SailCoach.", ext: "jpg" },
  { slug: "spring-2020", title: "Spring 2020", dateRange: "Mar – May 2020", context: "Pre-COVID training in Florida.", ext: "jpg" },
  { slug: "junior-years", title: "2017, 2018, 2019", dateRange: "2017 – 2019", context: "ILCA 4 then ILCA 7 transition. Junior fleets, learning years.", ext: "jpg" },
];

const PUBLIC_DIR = path.join(process.cwd(), "public", "images", "galleries");

function listPhotos(slug: string, ext: string): string[] {
  const dir = path.join(PUBLIC_DIR, slug);
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    console.warn(`[seed] no folder for ${slug}`);
    return [];
  }
  return entries
    .filter((f) => f.toLowerCase().startsWith("photo-") && f.toLowerCase().endsWith(`.${ext}`))
    .sort()
    .map((f) => `/images/galleries/${slug}/${f}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    const existing = await db
      .select()
      .from(schema.galleries)
      .where(eq(schema.galleries.slug, s.slug))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[seed] skip (exists): ${s.slug}`);
      continue;
    }

    const photoUrls = listPhotos(s.slug, s.ext);
    const cover = photoUrls[0] ?? null;

    const [g] = await db
      .insert(schema.galleries)
      .values({
        slug: s.slug,
        title: s.title,
        dateRange: s.dateRange,
        context: s.context,
        coverImageUrl: cover,
        sortOrder: i,
      })
      .returning();

    if (photoUrls.length > 0) {
      await db.insert(schema.galleryPhotos).values(
        photoUrls.map((url, idx) => ({
          galleryId: g.id,
          url,
          sortOrder: idx,
        })),
      );
    }
    console.log(`[seed] inserted: ${s.slug} (${photoUrls.length} photos)`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
