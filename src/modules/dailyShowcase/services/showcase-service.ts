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

/** Today's calendar date as YYYY-MM-DD (UTC). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Persist the extensions retrieved by the daily automation run into the
 * showcase table. Called from `runDailyJob` in the 24-hour automation.
 */
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

/**
 * Basic delivery: the showcased extensions exactly as stored, for guests and
 * free users. Defaults to the latest day on record when no date is supplied.
 */
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

/**
 * Turn a stored extension back into an AI candidate by recovering the browsable
 * repo link from its archive URL. The premium brain analyses the link, so this
 * is the only bridge needed between the DB row and the AI engine.
 */
function toAiCandidate(extension: Extension): RepoCandidateContext | null {
  const parsed = parseGithubZipUrl(extension.extensionLink);
  if (!parsed) return null;

  return {
    link: parsed.repoUrl,
    fullName: extension.name,
    defaultBranch: parsed.defaultBranch,
  };
}

/**
 * Premium delivery — anchored to the same showcase data as the basic feed, but
 * the AI "brain" is activated on demand (and only for a verified premium user)
 * to re-analyse each extension's link and return a richer, more informative
 * format. Nothing is searched on GitHub and nothing is written back to the DB;
 * the source set is identical to `getDailyShowcase`, only the output differs.
 */
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
