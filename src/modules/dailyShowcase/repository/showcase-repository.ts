import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { dailyShowcase } from "../db/schema";
import { extensions } from "@/modules/automation-engine/db/schema";

/**
 * Insert a batch of extensions into the showcase for a given day.
 * Idempotent: re-running for the same day ignores extensions already recorded
 * (guarded by the unique (extension_id, showcase_date) index).
 */
export async function insertShowcaseExtensions(
  extensionIds: string[],
  showcaseDate: string,
): Promise<{ inserted: number }> {
  if (extensionIds.length === 0) return { inserted: 0 };

  const values = extensionIds.map((extensionId) => ({
    extensionId,
    showcaseDate,
  }));

  const rows = await db
    .insert(dailyShowcase)
    .values(values)
    .onConflictDoNothing({
      target: [dailyShowcase.extensionId, dailyShowcase.showcaseDate],
    })
    .returning({ id: dailyShowcase.id });

  return { inserted: rows.length };
}

/** Most recent showcase day on record (YYYY-MM-DD), or null when empty. */
export async function getLatestShowcaseDate(): Promise<string | null> {
  const [row] = await db
    .select({
      showcaseDate: sql<string | null>`max(${dailyShowcase.showcaseDate})`,
    })
    .from(dailyShowcase);

  return row?.showcaseDate ?? null;
}

/** Full extension rows showcased on a given day, newest first. */
export async function findShowcaseByDate(showcaseDate: string) {
  return await db
    .select({ extension: extensions })
    .from(dailyShowcase)
    .innerJoin(extensions, eq(dailyShowcase.extensionId, extensions.id))
    .where(eq(dailyShowcase.showcaseDate, showcaseDate))
    .orderBy(desc(dailyShowcase.createdAt));
}
