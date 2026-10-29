import { db } from "@/db/client";
import { extensions } from "@/models";
import { and, eq, inArray, gte, isNull } from "drizzle-orm";

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
        // Only rows the scanner never enriched are prunable; scanned rows keep
        // their README, endpoints and score even while they have no engagement.
        isNull(extensions.securityScore),
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
