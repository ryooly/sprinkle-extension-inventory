import { fetchBrowserExtensions as fetchBasicExtensions } from "@/modules/automation-engine/github-explorer/api-engine";
import { cleanupStaleExtensions } from "@/modules/automation-engine/filtering-engine/filtering-engine/cleanup-engine";
import {
  getExtensions,
  type EngineResult,
} from "@/modules/automation-engine/algorithm-engine/algorithm-service/algorithm-services";
import { recordDailyShowcase } from "@/modules/dailyShowcase/services/showcase-service";
import { logger } from "@/logger";

import type {
  InsertionResult,
  CleanupResult,
  HourlyJobResult,
  DailyJobResult,
} from "./automation-type";

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class TwentyFourHourAutomation {
  private hourlyCron: { stop: () => void } | null = null;
  private dailyCron: { stop: () => void } | null = null;

  private async insertExtensions(): Promise<InsertionResult> {
    const token = process.env.GITHUB_TOKEN;

    const result = await fetchBasicExtensions({
      token,
      perPage: envInt("AUTOMATION_PER_PAGE", 5),
      minStars: envInt("AUTOMATION_MIN_STARS", 10),
    });

    const insertResult = result.data.insertResult;

    return {
      inserted: insertResult.inserted,
      failed: insertResult.failed,
      skipped: insertResult.skipped,
      failures: insertResult.failures,
    };
  }

  private async cleanup(): Promise<CleanupResult> {
    const deleted = await cleanupStaleExtensions();
    return { deleted: deleted.length };
  }

  async getTwentyFourHourExtensions(): Promise<EngineResult<unknown>> {
    return await getExtensions();
  }

  async runHourlyJob(): Promise<HourlyJobResult> {
    const errors: string[] = [];
    let insertion: InsertionResult | null = null;
    let cleanup: CleanupResult | null = null;

    try {
      insertion = await this.insertExtensions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`insertion failed: ${msg}`);
      logger.error(`[hourly] Insertion step failed: ${msg}`);
    }

    try {
      cleanup = await this.cleanup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`cleanup failed: ${msg}`);
      logger.error(`[hourly] Cleanup step failed: ${msg}`);
    }

    return { insertion, cleanup, errors };
  }

  async runDailyJob(): Promise<DailyJobResult> {
    try {
      const result = await this.getTwentyFourHourExtensions();
      const count = Array.isArray(result.data) ? result.data.length : 0;

      if (Array.isArray(result.data)) {
        const extensionIds = (result.data as Array<{ id?: unknown }>)
          .map((extension) => extension.id)
          .filter((id): id is string => typeof id === "string");

        await recordDailyShowcase(extensionIds);
      }

      return { success: result.success, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[daily] Extension retrieval failed: ${msg}`);
      return { success: false, count: 0, error: msg };
    }
  }

  startCronJobs() {
    const hourlyExpression = process.env.HOURLY_CRON ?? "0 * * * *";
    const dailyExpression = process.env.DAILY_CRON ?? "0 0 * * *";

    this.hourlyCron = Bun.cron(hourlyExpression, async () => {
      const started = Date.now();
      logger.info(
        `[hourly] Extension automation started at ${new Date().toISOString()}`,
      );

      const result = await this.runHourlyJob();

      const duration = ((Date.now() - started) / 1000).toFixed(1);
      logger.info(
        {
          duration: `${duration}s`,
          inserted: result.insertion?.inserted ?? 0,
          failed: result.insertion?.failed ?? 0,
          skipped: result.insertion?.skipped ?? 0,
          deleted: result.cleanup?.deleted ?? 0,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        "[hourly] Extension automation completed",
      );
    });

    this.dailyCron = Bun.cron(dailyExpression, async () => {
      const started = Date.now();
      logger.info(
        `[daily] Extension export started at ${new Date().toISOString()}`,
      );

      const result = await this.runDailyJob();

      const duration = ((Date.now() - started) / 1000).toFixed(1);
      logger.info(
        {
          duration: `${duration}s`,
          success: result.success,
          count: result.count,
          error: result.error,
        },
        "[daily] Extension export completed",
      );
    });

    logger.info(
      `[cron] Scheduled hourly (${hourlyExpression}) basic generation + cleanup and daily (${dailyExpression}) showcase export (global generator, no user context)`,
    );
  }

  stopCronJobs() {
    this.hourlyCron?.stop();
    this.dailyCron?.stop();
    this.hourlyCron = null;
    this.dailyCron = null;
    logger.info("[cron] All scheduled jobs stopped");
  }
}
