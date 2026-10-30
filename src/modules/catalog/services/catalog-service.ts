import { AppError } from "@/errorhandler";
import { browserEnum, categoryEnum, publisherTypeEnum } from "@/models";
import type {
  Browser,
  BrowserPermission,
  Category,
  Extension,
  PublisherType,
} from "@/models";
import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { config } from "config";
import {
  countCatalogExtensions,
  findCatalogExtensionById,
  findCatalogExtensions,
  findCategoriesByExtensionIds,
  findHashtagsByExtensionIds,
  findPermissionsByExtensionIds,
  type CatalogListRow,
} from "../repository/catalog-repository";

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 24;

export interface CatalogQueryInput {
  search?: string;
  category?: string;
  browser?: string;
  publisher?: string;
  developer?: string;
  name?: string;
  limit?: string | number;
  offset?: string | number;
}

export interface CatalogSummaryExtension extends CatalogListRow {
  categories: Category[];
  hashtags: string[];
}

export interface CatalogDetailExtension extends Extension {
  categories: Category[];
  hashtags: string[];
  permissions: BrowserPermission[];
}

export interface CatalogListResult {
  items: CatalogSummaryExtension[];
  total: number;
  limit: number;
  offset: number;
}

export interface CatalogBundleResult {
  fileName: string;
  filePath?: string;
  redirectUrl?: string;
}

function packageFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "extension"}.zip`;
}

function parseCategory(value?: string): Category | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  const match = categoryEnum.enumValues.find((entry) => entry === normalized);

  if (!match) throw new AppError(`Unknown category "${trimmed}"`, 400);

  return match;
}

function parseBrowser(value?: string): Browser | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  const match = browserEnum.enumValues.find((entry) => entry === normalized);

  if (!match) throw new AppError(`Unknown browser "${trimmed}"`, 400);

  return match;
}

function parsePublisher(value?: string): PublisherType | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  const match = publisherTypeEnum.enumValues.find(
    (entry) => entry === normalized,
  );

  if (!match) throw new AppError(`Unknown publisher "${trimmed}"`, 400);

  return match;
}

function parseCount(
  value: string | number | undefined,
  fallback: number,
): number {
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.trunc(parsed);
}

export async function listCatalogExtensions(
  input: CatalogQueryInput,
): Promise<CatalogListResult> {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseCount(input.limit, DEFAULT_LIMIT)),
  );
  const offset = Math.max(0, parseCount(input.offset, 0));

  const filters = {
    search: input.search?.trim() || undefined,
    category: parseCategory(input.category),
    browser: parseBrowser(input.browser),
    publisher: parsePublisher(input.publisher),
    developer: input.developer?.trim() || undefined,
    name: input.name?.trim() || undefined,
    limit,
    offset,
  };

  try {
    const rows = await findCatalogExtensions(filters);
    const total = await countCatalogExtensions(filters);
    const extensionIds = rows.map((row) => row.id);

    const [categories, hashtags] = await Promise.all([
      findCategoriesByExtensionIds(extensionIds),
      findHashtagsByExtensionIds(extensionIds),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        categories: categories.get(row.id) ?? [],
        hashtags: hashtags.get(row.id) ?? [],
      })),
      total,
      limit,
      offset,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch extensions", 500, { cause: err });
  }
}

export async function getCatalogExtension(
  id: string,
): Promise<CatalogDetailExtension> {
  const extension = await findCatalogExtensionById(id);

  if (!extension) {
    throw new AppError(`Extension with id "${id}" not found`, 404);
  }

  try {
    const [categories, hashtags, permissions] = await Promise.all([
      findCategoriesByExtensionIds([extension.id]),
      findHashtagsByExtensionIds([extension.id]),
      findPermissionsByExtensionIds([extension.id]),
    ]);

    return {
      ...extension,
      categories: categories.get(extension.id) ?? [],
      hashtags: hashtags.get(extension.id) ?? [],
      permissions: permissions.get(extension.id) ?? [],
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extension "${id}"`, 500, {
      cause: err,
    });
  }
}

// Public download entry point: builder uploads are served from the upload
// directory, while automation rows keep pointing at their upstream archive.
export async function getCatalogExtensionBundle(
  id: string,
): Promise<CatalogBundleResult> {
  const extension = await findCatalogExtensionById(id);

  if (!extension) {
    throw new AppError(`Extension with id "${id}" not found`, 404);
  }

  const fileName = packageFileName(extension.name);
  const uploadRoot = resolve(config.uploadDir);
  const storedPath = resolve(extension.extensionLink);
  const inside = relative(uploadRoot, storedPath);

  if (
    inside.length > 0 &&
    !inside.startsWith("..") &&
    !isAbsolute(inside) &&
    existsSync(storedPath)
  ) {
    return { fileName, filePath: storedPath };
  }

  if (/^https?:\/\//i.test(extension.extensionLink)) {
    return { fileName, redirectUrl: extension.extensionLink };
  }

  throw new AppError(
    `Extension "${extension.name}" has no downloadable package`,
    404,
  );
}
