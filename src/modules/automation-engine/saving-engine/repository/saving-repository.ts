import { db } from "@/db/client";
import {
  extensions,
  extensionCategories,
  extensionHashtags,
  extensionPermissions,
  fetchedRepos,
  hashtags,
} from "@/models";
import { and, arrayContains, eq, ilike, inArray } from "drizzle-orm";
import type {
  NewExtension,
  NewExtensionCategory,
  NewExtensionHashtag,
  Category,
  Browser,
  BrowserPermission,
} from "@/models";
import { AppError } from "@/errorhandler";
import { escapeLikePattern } from "../../depends/sanitize";
import type { Extension } from "@/models";

type DbExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureHashtags(
  executor: DbExecutor,
  names: string[],
): Promise<string[]> {
  const unique = [...new Set(names)].filter((name) => name.length > 0);

  if (unique.length === 0) return [];

  await executor
    .insert(hashtags)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing({ target: hashtags.name });

  const rows = await executor
    .select({ id: hashtags.id })
    .from(hashtags)
    .where(inArray(hashtags.name, unique));

  return rows.map((row) => row.id);
}

export interface CreateExtensionPayload extends NewExtension {
  categories: Category[];
  permissions?: BrowserPermission[];
  hashtags?: string[];
}

export interface UpdateExtensionPayload {
  id: string;
  data: Partial<Omit<NewExtension, "id" | "createdAt" | "updatedAt">>;
  categories?: Category[];
  hashtags?: string[];
  permissions?: BrowserPermission[];
}

async function replacePermissions(
  executor: DbExecutor,
  extensionId: string,
  permissions: BrowserPermission[],
): Promise<void> {
  await executor
    .delete(extensionPermissions)
    .where(eq(extensionPermissions.extensionId, extensionId));

  const unique = [...new Set(permissions)];
  if (unique.length === 0) return;

  await executor.insert(extensionPermissions).values(
    unique.map((permission) => ({
      extensionId,
      permission,
    })),
  );
}

export async function createExtension(payload: CreateExtensionPayload) {
  const { categories, permissions, hashtags, ...extensionData } = payload;

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

    if (hashtags && hashtags.length > 0) {
      const hashtagIds = await ensureHashtags(tx, hashtags);

      const hashtagRows: NewExtensionHashtag[] = hashtagIds.map(
        (hashtagId) => ({
          extensionId: extension.id,
          hashtagId,
        }),
      );

      await tx.insert(extensionHashtags).values(hashtagRows);
    }

    if (permissions && permissions.length > 0) {
      await replacePermissions(tx, extension.id, permissions);
    }

    return extension;
  });
}

export async function updateExtension(payload: UpdateExtensionPayload) {
  const { id, data, categories, hashtags, permissions } = payload;

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

    if (hashtags) {
      await tx
        .delete(extensionHashtags)
        .where(eq(extensionHashtags.extensionId, id));

      if (hashtags.length > 0) {
        const hashtagIds = await ensureHashtags(tx, hashtags);

        const hashtagRows: NewExtensionHashtag[] = hashtagIds.map(
          (hashtagId) => ({
            extensionId: id,
            hashtagId,
          }),
        );

        await tx.insert(extensionHashtags).values(hashtagRows);
      }
    }

    if (permissions) {
      await replacePermissions(tx, id, permissions);
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

export async function findExtensionById(id: string): Promise<Extension | null> {
  const [extension] = await db
    .select()
    .from(extensions)
    .where(eq(extensions.id, id))
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

export const MAX_SEARCH_RESULTS = 50;

export async function findExtensionsByName(name: string): Promise<Extension[]> {
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

export async function findExtensionsByHashtag(
  hashtag: string,
): Promise<Extension[]> {
  const rows = await db
    .select({ extension: extensions })
    .from(extensions)
    .innerJoin(
      extensionHashtags,
      eq(extensionHashtags.extensionId, extensions.id),
    )
    .innerJoin(hashtags, eq(extensionHashtags.hashtagId, hashtags.id))
    .where(eq(hashtags.name, hashtag));

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
  return db
    .select()
    .from(extensions)
    .where(arrayContains(extensions.supportedBrowsers, [browser]));
}
