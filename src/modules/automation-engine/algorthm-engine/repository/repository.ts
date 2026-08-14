import { db } from "../../db/client";
import { extensions } from "../../db/schema";
import { eq, sql, inArray, desc } from "drizzle-orm";
import { AppError } from "@/middlewares/errorHandler";

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

export async function findPremiumExtensions() {
  return await db.query.extensions.findMany({
    where: eq(extensions.extensionStatus, "premium"),
    limit: 35,
    orderBy: [desc(extensions.createdAt)],
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
