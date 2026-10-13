import { AppError } from "@/errorhandler";
import { hasActiveSubscription } from "@/middlewares/premium-middleware";
import {
  GithubAIEngine,
  GeminiBrowsingProvider,
} from "@/modules/automation-engine/premium-engine/ai-engine/gpt.engine";
import { parseGithubZipUrl } from "@/modules/automation-engine/depends/extension-utils";
import type { RepoCandidateContext } from "@/modules/automation-engine/depends/ai-response-mapper";
import type { ExtensionRepo } from "@/modules/automation-engine/github-explorer/api-engine";
import type { Extension } from "@/models";
import {
  insertShowcaseExtensions,
  getLatestShowcaseDate,
  findShowcaseByDate,
  findPremiumByDate,
  insertPremiumExtensions,
  type PremiumShowcaseRow,
  type PremiumExtensionInput,
} from "../repository/showcase-repository";

export interface ShowcaseResult {
  date: string | null;
  extensions: ExtensionRepo[] | Extension[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    const showcaseDate = date?.trim() || (await getLatestShowcaseDate());

    if (!showcaseDate) {
      return { date: null, extensions: [] };
    }

    const rows = await findShowcaseByDate(showcaseDate);

    return {
      date: showcaseDate,
      extensions: rows.map((row) => row.extension),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch daily showcase", 500, { cause: err });
  }
}

function toAiCandidate(extension: Extension): RepoCandidateContext | null {
  const parsed = parseGithubZipUrl(extension.extensionLink);
  if (!parsed) return null;

  return {
    link: parsed.repoUrl,
    fullName: extension.name,
    defaultBranch: parsed.defaultBranch,
  };
}

function toPremiumExtensionRepo(row: PremiumShowcaseRow): ExtensionRepo {
  return {
    name: row.extension.name,
    publisher: row.extension.developer,
    description: row.premium.aiDescription,
    downloadUrl: row.extension.extensionLink,
    category: row.premium.categories,
    sourceRepoName: row.extension.name,
    extensionStatus: "premium",
    verified: row.premium.verified,
    verificationPercentage: row.premium.verificationPercentage ?? 0,
    permissions: row.premium.permissions ?? [],
    licenseKey: row.premium.licenseKey ?? undefined,
    licenseName: row.premium.licenseName ?? undefined,
    licenseUrl: row.premium.licenseUrl ?? undefined,
  };
}

async function persistPremiumExtensions(
  rows: { extension: Extension }[],
  generated: ExtensionRepo[],
  premiumDate: string,
): Promise<void> {
  const idByName = new Map(
    rows.map((row) => [row.extension.name, row.extension.id] as const),
  );

  const inputs: PremiumExtensionInput[] = [];

  for (const repo of generated) {
    const extensionId = idByName.get(repo.sourceRepoName ?? repo.name);
    if (!extensionId) continue;

    inputs.push({
      extensionId,
      premiumDate,
      aiDescription: repo.description,
      verified: repo.verified ?? "not_verified",
      verificationPercentage: repo.verificationPercentage ?? 0,
      categories: repo.category,
      permissions: repo.permissions ?? [],
      licenseKey: repo.licenseKey ?? null,
      licenseName: repo.licenseName ?? null,
      licenseUrl: repo.licenseUrl ?? null,
    });
  }

  if (inputs.length > 0) {
    await insertPremiumExtensions(inputs);
  }
}

export async function getPremiumShowcase(
  userId: string,
  date?: string,
): Promise<ShowcaseResult> {
  const isPremium = await hasActiveSubscription(userId);
  if (!isPremium) {
    throw new AppError("Premium subscription required", 403);
  }

  try {
    const showcaseDate = date?.trim() || (await getLatestShowcaseDate());

    if (!showcaseDate) {
      return { date: null, extensions: [] };
    }

    const cached = await findPremiumByDate(showcaseDate);
    if (cached.length > 0) {
      return {
        date: showcaseDate,
        extensions: cached.map(toPremiumExtensionRepo),
      };
    }

    const rows = await findShowcaseByDate(showcaseDate);

    const candidates = rows
      .map((row) => toAiCandidate(row.extension))
      .filter(
        (candidate): candidate is RepoCandidateContext => candidate !== null,
      );

    if (candidates.length === 0) {
      return { date: showcaseDate, extensions: [] };
    }

    const engine = new GithubAIEngine(new GeminiBrowsingProvider());
    const extensions = await engine.processGithubSearchResults(candidates);

    await persistPremiumExtensions(rows, extensions, showcaseDate);

    return { date: showcaseDate, extensions };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch premium showcase", 500, { cause: err });
  }
}
