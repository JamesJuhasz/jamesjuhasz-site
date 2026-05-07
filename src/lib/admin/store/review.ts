import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  resultReviewDecisions,
  type NewResultReviewDecisionRow,
  type ResultReviewDecisionRow,
} from "@/db/schema";

export async function listDecisions(): Promise<ResultReviewDecisionRow[]> {
  const db = getDb();
  return db.select().from(resultReviewDecisions);
}

export async function getDecision(
  eventId: string,
): Promise<ResultReviewDecisionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(resultReviewDecisions)
    .where(eq(resultReviewDecisions.eventId, eventId))
    .limit(1);
  return row ?? null;
}

export async function upsertDecision(
  input: NewResultReviewDecisionRow,
): Promise<ResultReviewDecisionRow> {
  const db = getDb();
  const [row] = await db
    .insert(resultReviewDecisions)
    .values(input)
    .onConflictDoUpdate({
      target: resultReviewDecisions.eventId,
      set: { ...input, decidedAt: new Date() },
    })
    .returning();
  return row;
}
