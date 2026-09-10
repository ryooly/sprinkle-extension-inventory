import { AppError } from "@/middlewares/errorHandler";
import {
  insertShowcaseExtensions,
  getLatestShowcaseDate,
  findShowcaseByDate,
} from "../repository/showcase-repository";

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
 * Fetch the showcased extensions for the frontend. Defaults to the latest day
 * on record when no explicit date is supplied.
 */
export async function getDailyShowcase(
  date?: string,
): Promise<{ date: string | null; extensions: unknown[] }> {
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
