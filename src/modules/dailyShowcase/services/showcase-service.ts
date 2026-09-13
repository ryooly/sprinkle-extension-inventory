import { AppError } from "@/middlewares/errorHandler";
import { hasActiveSubscription } from "@/middlewares/premium-middleware";
import {
  GithubAIEngine,
  GeminiBrowsingProvider,
} from "@/modules/automation-engine/premium-engine/ai-engine/gpt.engine";
import { parseGithubZipUrl } from "@/modules/automation-engine/depends/extension-utils";
import type { RepoCandidateContext } from "@/modules/automation-engine/depends/ai-response-mapper";
import type { ExtensionRepo } from "@/modules/automation-engine/github-explorer/api-engine";
import type { Extension } from "@/modules/automation-engine/db/schema";
import {
  insertShowcaseExtensions,
  getLatestShowcaseDate,
  findShowcaseByDate,
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

    return { date: showcaseDate, extensions };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch premium showcase", 500, { cause: err });
  }
}
