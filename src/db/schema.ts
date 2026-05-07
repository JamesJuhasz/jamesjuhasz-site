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
