import { db } from "../../db/client";
import { extensions } from "../../db/schema";
import { and, eq, inArray, gte } from "drizzle-orm";

const STALE_AMOUNT_DISPLAYED = 5;

export async function deleteStaleExtensions(limit: number) {
  const staleRows = await db
    .select({ id: extensions.id })
    .from(extensions)
    .where(
      and(
        gte(extensions.amountDisplayed, STALE_AMOUNT_DISPLAYED),
        eq(extensions.downloads, 0),
        eq(extensions.views, 0),
      ),
    )
    .limit(limit);

  if (staleRows.length === 0) return [];

  const ids = staleRows.map((row) => row.id);

  return await db
    .delete(extensions)
    .where(inArray(extensions.id, ids))
    .returning();
}
