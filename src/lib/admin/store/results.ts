import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  resultOverrides,
  type NewResultOverrideRow,
  type ResultOverrideRow,
} from "@/db/schema";

export async function listOverrides(): Promise<ResultOverrideRow[]> {
  const db = getDb();
  return db.select().from(resultOverrides);
}

export async function getOverride(
  coachaibleId: string,
): Promise<ResultOverrideRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(resultOverrides)
    .where(eq(resultOverrides.coachaibleId, coachaibleId))
    .limit(1);
  return row ?? null;
}

export async function upsertOverride(
  input: NewResultOverrideRow,
): Promise<ResultOverrideRow> {
  const db = getDb();
  const [row] = await db
    .insert(resultOverrides)
    .values(input)
    .onConflictDoUpdate({
      target: resultOverrides.coachaibleId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function deleteOverride(coachaibleId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(resultOverrides)
    .where(eq(resultOverrides.coachaibleId, coachaibleId))
    .returning({ id: resultOverrides.coachaibleId });
  return rows.length > 0;
}
