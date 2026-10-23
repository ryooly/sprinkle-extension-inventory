import { AppError } from "@/errorhandler";
import type { Extension, PublisherType, Source } from "@/models";
import {
  insertShowcaseExtensions,
  getLatestShowcaseDate,
  findShowcaseByDate,
  findAvailableExtensions,
} from "../repository/showcase-repository";

export interface ShowcaseBasicExtension {
  id: string;
  publishedBy: PublisherType;
  name: string;
  description: string;
  developer: string;
  source: Source;
  extensionLink: string;
  frontendLanguages: string[] | null;
  backendLanguages: string[] | null;
  licenseName: string | null;
  licenseKey: string | null;
  licenseDescription: string | null;
  licensePermissions: string[] | null;
  licenseConditions: string[] | null;
  licenseLimitations: string[] | null;
  licenseUrl: string | null;
  views: number;
  downloads: number;
  amountDisplayed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShowcaseResult {
  date: string | null;
  extensions: Extension[] | ShowcaseBasicExtension[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toBasicExtension(extension: Extension): ShowcaseBasicExtension {
  return {
    id: extension.id,
    publishedBy: extension.publishedBy,
    name: extension.name,
    description: extension.description,
    developer: extension.developer,
    source: extension.source,
    extensionLink: extension.extensionLink,
    frontendLanguages: extension.frontendLanguages,
    backendLanguages: extension.backendLanguages,
    licenseName: extension.licenseName,
    licenseKey: extension.licenseKey,
    licenseDescription: extension.licenseDescription,
    licensePermissions: extension.licensePermissions,
    licenseConditions: extension.licenseConditions,
    licenseLimitations: extension.licenseLimitations,
    licenseUrl: extension.licenseUrl,
    views: extension.views,
    downloads: extension.downloads,
    amountDisplayed: extension.amountDisplayed,
    createdAt: extension.createdAt,
    updatedAt: extension.updatedAt,
  };
}

async function resolveShowcaseExtensions(
  showcaseDate: string,
): Promise<Extension[]> {
  const rows = await findShowcaseByDate(showcaseDate);

  if (rows.length > 0) {
    return rows.map((row) => row.extension);
  }

  const sourceExtensions = await findAvailableExtensions();

  if (sourceExtensions.length === 0) {
    return [];
  }

  const extensionIds = sourceExtensions
    .map((extension) => extension.id)
    .filter((id): id is string => typeof id === "string");

  await insertShowcaseExtensions(extensionIds, showcaseDate);

  return sourceExtensions;
}

export async function recordDailyShowcase(
  extensionIds: string[],
): Promise<{ inserted: number }> {
  try {
    return await insertShowcaseExtensions(extensionIds, todayISO());
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to record daily showcase", 500, { cause: err });
  }
}

export async function getDailyShowcase(date?: string): Promise<ShowcaseResult> {
  try {
    const showcaseDate =
      date?.trim() || (await getLatestShowcaseDate()) || todayISO();

    const extensions = await resolveShowcaseExtensions(showcaseDate);

    return {
      date: showcaseDate,
      extensions: extensions.map(toBasicExtension),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch daily showcase", 500, { cause: err });
  }
}

export async function getPremiumShowcase(
  date?: string,
): Promise<ShowcaseResult> {
  try {
    const showcaseDate =
      date?.trim() || (await getLatestShowcaseDate()) || todayISO();

    const extensions = await resolveShowcaseExtensions(showcaseDate);

    return { date: showcaseDate, extensions };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch premium showcase", 500, { cause: err });
  }
}
