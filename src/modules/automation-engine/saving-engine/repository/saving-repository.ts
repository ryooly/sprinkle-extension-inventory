import { db } from "../../db/client";
import { extensions, extensionCategories, fetchedRepos } from "../../db/schema";
import { eq, ilike } from "drizzle-orm";
import type {
  NewExtension,
  NewExtensionCategory,
  Category,
  Browser,
} from "../../db/schema";
import { AppError } from "@/middlewares/errorHandler";
import type { Extension } from "../../db/schema";


export interface CreateExtensionPayload extends NewExtension {
  categories: Category[];
}

export interface UpdateExtensionPayload {
  id: string;
  data: Partial<Omit<NewExtension, "id" | "createdAt" | "updatedAt">>;
  categories?: Category[];
}

export async function createExtension(payload: CreateExtensionPayload) {
  const { categories, ...extensionData } = payload;

  return await db.transaction(async (tx) => {
    const [extension] = await tx
      .insert(extensions)
      .values(extensionData)
      .returning();

    if (categories.length > 0) {
      const categoryRows: NewExtensionCategory[] = categories.map((category) => ({
        extensionId: extension.id,
        category,
      }));

      await tx.insert(extensionCategories).values(categoryRows);
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

    if (!updated) throw new AppError(`Extension with id "${id}" not found`, 500);

    if (categories && categories.length > 0) {
      await tx
        .delete(extensionCategories)
        .where(eq(extensionCategories.extensionId, id));

      const categoryRows: NewExtensionCategory[] = categories.map((category) => ({
        extensionId: id,
        category,
      }));

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
    .returning();

  return repo;
}

export async function getFetchedRepoByName(repoName: string) {
  const [repo] = await db
    .select()
    .from(fetchedRepos)
    .where(eq(fetchedRepos.repoName, repoName))
    .limit(1);

  return repo ?? null;
}

export async function findExtensionsByName(name: string): Promise<Extension[]> {
  return db
    .select()
    .from(extensions)
    .where(ilike(extensions.name, `%${name}%`));
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

export async function findExtensionsByBrowser(browser: Browser): Promise<Extension[]> {
  return db
    .select()
    .from(extensions)
    .where(eq(extensions.browser, browser));
}
