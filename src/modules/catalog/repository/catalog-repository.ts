import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  extensionCategories,
  extensionHashtags,
  extensions,
  hashtags,
} from "@/models";
import type { Browser, Category, Extension, PublisherType } from "@/models";

export interface CatalogFilters {
  search?: string;
  category?: Category;
  browser?: Browser;
  publisher?: PublisherType;
  developer?: string;
  name?: string;
  limit: number;
  offset: number;
}

export const catalogListColumns = {
  id: extensions.id,
  publishedBy: extensions.publishedBy,
  name: extensions.name,
  description: extensions.description,
  developer: extensions.developer,
  source: extensions.source,
  extensionLink: extensions.extensionLink,
  supportedBrowsers: extensions.supportedBrowsers,
  frontendLanguages: extensions.frontendLanguages,
  backendLanguages: extensions.backendLanguages,
  lastCommitDate: extensions.lastCommitDate,
  stars: extensions.stars,
  securityScore: extensions.securityScore,
  announcement: extensions.announcement,
  extensionStatus: extensions.extensionStatus,
  licenseName: extensions.licenseName,
  licenseKey: extensions.licenseKey,
  licenseUrl: extensions.licenseUrl,
  views: extensions.views,
  downloads: extensions.downloads,
  amountDisplayed: extensions.amountDisplayed,
  createdAt: extensions.createdAt,
  updatedAt: extensions.updatedAt,
};

export type CatalogListRow = {
  id: string;
  publishedBy: PublisherType;
  name: string;
  description: string;
  developer: string;
  source: Extension["source"];
  extensionLink: string;
  supportedBrowsers: Browser[] | null;
  frontendLanguages: string[] | null;
  backendLanguages: string[] | null;
  lastCommitDate: Date | null;
  stars: number | null;
  securityScore: number | null;
  announcement: string | null;
  extensionStatus: Extension["extensionStatus"];
  licenseName: string | null;
  licenseKey: string | null;
  licenseUrl: string | null;
  views: number;
  downloads: number;
  amountDisplayed: number;
  createdAt: Date;
  updatedAt: Date;
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildConditions(filters: CatalogFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.search) {
    const pattern = `%${escapeLikePattern(filters.search)}%`;
    const searchCondition = or(
      ilike(extensions.name, pattern),
      ilike(extensions.developer, pattern),
      ilike(extensions.description, pattern),
    );

    if (searchCondition) conditions.push(searchCondition);
  }

  if (filters.developer) {
    conditions.push(ilike(extensions.developer, filters.developer));
  }

  if (filters.name) {
    conditions.push(ilike(extensions.name, filters.name));
  }

  if (filters.publisher) {
    conditions.push(eq(extensions.publishedBy, filters.publisher));
  }

  if (filters.browser) {
    conditions.push(
      sql`${extensions.supportedBrowsers} @> ARRAY[${filters.browser}]::browser[]`,
    );
  }

  if (filters.category) {
    conditions.push(
      inArray(
        extensions.id,
        db
          .select({ id: extensionCategories.extensionId })
          .from(extensionCategories)
          .where(eq(extensionCategories.category, filters.category)),
      ),
    );
  }

  return conditions;
}

export async function findCatalogExtensions(
  filters: CatalogFilters,
): Promise<CatalogListRow[]> {
  const conditions = buildConditions(filters);

  const rows = await db
    .select(catalogListColumns)
    .from(extensions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(extensions.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);

  return rows;
}

export async function countCatalogExtensions(
  filters: CatalogFilters,
): Promise<number> {
  const conditions = buildConditions(filters);

  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(extensions)
    .where(conditions.length ? and(...conditions) : undefined);

  return row?.total ?? 0;
}

export async function findCatalogExtensionById(
  id: string,
): Promise<Extension | null> {
  const [row] = await db
    .select()
    .from(extensions)
    .where(eq(extensions.id, id))
    .limit(1);

  return row ?? null;
}

export async function findCategoriesByExtensionIds(
  extensionIds: string[],
): Promise<Map<string, Category[]>> {
  const grouped = new Map<string, Category[]>();
  if (extensionIds.length === 0) return grouped;

  const rows = await db
    .select({
      extensionId: extensionCategories.extensionId,
      category: extensionCategories.category,
    })
    .from(extensionCategories)
    .where(inArray(extensionCategories.extensionId, extensionIds));

  for (const row of rows) {
    const list = grouped.get(row.extensionId) ?? [];
    list.push(row.category);
    grouped.set(row.extensionId, list);
  }

  return grouped;
}

export async function findHashtagsByExtensionIds(
  extensionIds: string[],
): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  if (extensionIds.length === 0) return grouped;

  const rows = await db
    .select({
      extensionId: extensionHashtags.extensionId,
      name: hashtags.name,
    })
    .from(extensionHashtags)
    .innerJoin(hashtags, eq(extensionHashtags.hashtagId, hashtags.id))
    .where(inArray(extensionHashtags.extensionId, extensionIds));

  for (const row of rows) {
    const list = grouped.get(row.extensionId) ?? [];
    list.push(row.name);
    grouped.set(row.extensionId, list);
  }

  return grouped;
}
