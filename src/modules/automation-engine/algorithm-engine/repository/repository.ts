import { db } from "@/db/client";
import { extensions, savedExtensions } from "@/models";
import { and, eq, sql, inArray, desc } from "drizzle-orm";
import { AppError } from "@/errorhandler";

export async function findExtensions() {
  return await db.query.extensions.findMany({
    limit: 25,
    orderBy: [desc(extensions.createdAt)],
    with: {
      categories: true,
    },
  });
}

export async function findUserExtensions() {
  return await db.query.extensions.findMany({
    where: eq(extensions.publishedBy, "user"),
    limit: 10,
    orderBy: [sql`${extensions.views} + ${extensions.downloads} DESC`],
    with: {
      categories: true,
    },
  });
}

export async function incrementViews(id: string) {
  const [updated] = await db
    .update(extensions)
    .set({ views: sql`${extensions.views} + 1` })
    .where(eq(extensions.id, id))
    .returning();

  if (!updated) throw new AppError(`Extension with id "${id}" not found`, 500);

  return updated;
}

export async function incrementDownloads(id: string) {
  const [updated] = await db
    .update(extensions)
    .set({ downloads: sql`${extensions.downloads} + 1` })
    .where(eq(extensions.id, id))
    .returning();

  if (!updated) throw new AppError(`Extension with id "${id}" not found`, 500);

  return updated;
}

export async function incrementAmountDisplayed(id: string) {
  const [updated] = await db
    .update(extensions)
    .set({ amountDisplayed: sql`${extensions.amountDisplayed} + 1` })
    .where(eq(extensions.id, id))
    .returning();

  if (!updated) throw new AppError(`Extension with id "${id}" not found`, 500);

  return updated;
}

// --- saved-extensions ---

export async function findSavedByOwnerAndExt(
  ownerId: string,
  extensionId: string,
) {
  return await db.query.savedExtensions.findFirst({
    where: and(
      eq(savedExtensions.ownerId, ownerId),
      eq(savedExtensions.extensionId, extensionId),
    ),
  });
}

export async function listSavedExtensions(ownerId: string) {
  const rows = await db
    .select({ ext: extensions })
    .from(savedExtensions)
    .innerJoin(extensions, eq(savedExtensions.extensionId, extensions.id))
    .where(eq(savedExtensions.ownerId, ownerId))
    .orderBy(desc(savedExtensions.savedAt));
  return rows.map((r) => r.ext);
}

export async function insertSavedExtension(
  ownerId: string,
  extensionId: string,
) {
  const [created] = await db
    .insert(savedExtensions)
    .values({ ownerId, extensionId })
    .onConflictDoNothing({
      target: [savedExtensions.ownerId, savedExtensions.extensionId],
    })
    .returning();
  return created ?? null;
}

export async function deleteSavedExtension(
  ownerId: string,
  extensionId: string,
) {
  const [row] = await db
    .delete(savedExtensions)
    .where(
      and(
        eq(savedExtensions.ownerId, ownerId),
        eq(savedExtensions.extensionId, extensionId),
      ),
    )
    .returning();
  return row ?? null;
}
