import { db } from "../../db/client";
import {
  extensions,
  extensionCategories,
  extensionPermissions,
  fetchedRepos,
} from "../../db/schema";
import { and, eq, ilike } from "drizzle-orm";
import type {
  NewExtension,
  NewExtensionCategory,
  Category,
  Browser,
  BrowserPermission,
} from "../../db/schema";
import { AppError } from "@/middlewares/errorHandler";
import { escapeLikePattern } from "../../depends/sanitize";
import type { Extension } from "../../db/schema";

export interface CreateExtensionPayload extends NewExtension {
  categories: Category[];
  permissions?: BrowserPermission[];
}

export interface UpdateExtensionPayload {
  id: string;
  data: Partial<Omit<NewExtension, "id" | "createdAt" | "updatedAt">>;
  categories?: Category[];
}

export async function createExtension(payload: CreateExtensionPayload) {
  const { categories, permissions, ...extensionData } = payload;

  return await db.transaction(async (tx) => {
    const [extension] = await tx
      .insert(extensions)
      .values(extensionData)
      .returning();

    if (categories.length > 0) {
      const categoryRows: NewExtensionCategory[] = categories.map(
        (category) => ({
          extensionId: extension.id,
          category,
        }),
      );

      await tx.insert(extensionCategories).values(categoryRows);
    }

    if (permissions && permissions.length > 0) {
      const uniquePermissions = [...new Set(permissions)];

      await tx.insert(extensionPermissions).values(
        uniquePermissions.map((permission) => ({
          extensionId: extension.id,
          permission,
        })),
      );
    }

    return extension;
  });
}

export async function updateExtension(payload: UpdateExtensionPayload) {
  const { id, data, categories } = payload;

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(extensions)
      .set(data)
      .where(eq(extensions.id, id))
      .returning();

    if (!updated)
      throw new AppError(`Extension with id "${id}" not found`, 500);

    if (categories && categories.length > 0) {
      await tx
        .delete(extensionCategories)
        .where(eq(extensionCategories.extensionId, id));

      const categoryRows: NewExtensionCategory[] = categories.map(
        (category) => ({
          extensionId: id,
          category,
        }),
      );

      await tx.insert(extensionCategories).values(categoryRows);
    }

    return updated;
  });
}

export async function deleteExtension(id: string) {
  const [deleted] = await db
    .delete(extensions)
    .where(eq(extensions.id, id))
    .returning();

  if (!deleted) throw new AppError(`Extension with id "${id}" not found`, 404);

  return deleted;
}

export async function createFetchedRepo(repoName: string) {
  const [repo] = await db
    .insert(fetchedRepos)
    .values({ repoName })
    .onConflictDoNothing({ target: fetchedRepos.repoName })
    .returning();

  return repo ?? null;
}

export async function findExtensionByNameAndDeveloper(
  name: string,
  developer: string,
) {
  const [extension] = await db
    .select()
    .from(extensions)
    .where(and(eq(extensions.name, name), eq(extensions.developer, developer)))
    .limit(1);

  return extension ?? null;
}

export async function getFetchedRepoByName(repoName: string) {
  const [repo] = await db
    .select()
    .from(fetchedRepos)
    .where(eq(fetchedRepos.repoName, repoName))
    .limit(1);

  return repo ?? null;
}

// Upper bound for name search results, so a broad term cannot return an
// unbounded result set.
export const MAX_SEARCH_RESULTS = 50;

export async function findExtensionsByName(name: string): Promise<Extension[]> {
  // `%`, `_` and `\` are escaped so the term matches literally instead of
  // acting as a LIKE wildcard (a bare `%` would otherwise match every row).
  const pattern = `%${escapeLikePattern(name)}%`;

  return db
    .select()
    .from(extensions)
    .where(ilike(extensions.name, pattern))
    .limit(MAX_SEARCH_RESULTS);
}

export async function findExtensionsByCategory(
  category: Category,
): Promise<Extension[]> {
  const rows = await db
    .select({ extension: extensions })
    .from(extensions)
    .innerJoin(
      extensionCategories,
      eq(extensionCategories.extensionId, extensions.id),
    )
    .where(eq(extensionCategories.category, category));

  return rows.map((row) => row.extension);
}

export async function findExtensionByRepoFullName(fullName: string) {
  const [extension] = await db
    .select()
    .from(extensions)
    .where(eq(extensions.name, fullName))
    .limit(1);

  return extension ?? null;
}

export async function findExtensionsByBrowser(
  browser: Browser,
): Promise<Extension[]> {
  return db.select().from(extensions).where(eq(extensions.browser, browser));
}
