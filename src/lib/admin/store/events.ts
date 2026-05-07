import { eq, desc, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { events, type EventRow, type NewEventRow } from "@/db/schema";

export async function listEvents(): Promise<EventRow[]> {
  const db = getDb();
  return db.select().from(events).orderBy(desc(events.eventDate));
}

export async function listEventsAsc(): Promise<EventRow[]> {
  const db = getDb();
  return db.select().from(events).orderBy(asc(events.eventDate));
}

export async function getEventById(id: number): Promise<EventRow | null> {
  const db = getDb();
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return row ?? null;
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const db = getDb();
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return row ?? null;
}

export async function createEvent(input: NewEventRow): Promise<EventRow> {
  const db = getDb();
  const [row] = await db.insert(events).values(input).returning();
  return row;
}

export async function updateEvent(
  id: number,
  patch: Partial<NewEventRow>,
): Promise<EventRow | null> {
  const db = getDb();
  const [row] = await db
    .update(events)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return row ?? null;
}

export async function deleteEvent(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(events)
    .where(eq(events.id, id))
    .returning({ id: events.id });
  return rows.length > 0;
}
