import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    eventDate: date("event_date").notNull(),
    endDate: date("end_date"),
    location: text("location").notNull(),
    category: text("category").notNull(), // 'Regatta' | 'Training' | 'Coaching'
    resultPosition: text("result_position"),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: text("cover_image_alt"),
    bodyHtml: text("body_html"),
    bodyJson: jsonb("body_json"),
    upcoming: boolean("upcoming").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(t.slug),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: text("cover_image_alt"),
    bodyHtml: text("body_html"),
    bodyJson: jsonb("body_json"),
    tags: text("tags").array(),
    featured: boolean("featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    broadcastId: text("broadcast_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("posts_slug_idx").on(t.slug),
  }),
);

export const resultOverrides = pgTable("result_overrides", {
  coachaibleId: text("coachaible_id").primaryKey(),
  position: text("position"),
  totalCompetitors: integer("total_competitors"),
  fleet: text("fleet"),
  externalUrl: text("external_url"),
  notes: text("notes"),
  hidden: boolean("hidden").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const galleries = pgTable(
  "galleries",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    dateRange: text("date_range").notNull(),
    startMonth: date("start_month"),
    endMonth: date("end_month"),
    context: text("context"),
    coverImageUrl: text("cover_image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    lastAnnouncedAt: timestamp("last_announced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("galleries_slug_idx").on(t.slug),
  }),
);

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id")
    .notNull()
    .references(() => galleries.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resultReviewDecisions = pgTable("result_review_decisions", {
  eventId: text("event_id").primaryKey(),
  decision: text("decision").notNull(), // 'approve' | 'reject'
  overrides: jsonb("overrides"),
  decidedAt: timestamp("decided_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type PostRow = typeof posts.$inferSelect;
export type NewPostRow = typeof posts.$inferInsert;
export type ResultOverrideRow = typeof resultOverrides.$inferSelect;
export type NewResultOverrideRow = typeof resultOverrides.$inferInsert;
export type ResultReviewDecisionRow = typeof resultReviewDecisions.$inferSelect;
export type NewResultReviewDecisionRow =
  typeof resultReviewDecisions.$inferInsert;
export type GalleryRow = typeof galleries.$inferSelect;
export type NewGalleryRow = typeof galleries.$inferInsert;
export type GalleryPhotoRow = typeof galleryPhotos.$inferSelect;
export type NewGalleryPhotoRow = typeof galleryPhotos.$inferInsert;
