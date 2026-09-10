import { fetchBrowserExtensions as fetchBasicExtensions } from "@/modules/automation-engine/github-explorer/api-engine";
import { cleanupStaleExtensions } from "@/modules/automation-engine/filtering-engine/filtering-engine/cleanup-engine";
import {
  getExtensions,
  type EngineResult,
} from "@/modules/automation-engine/algorithm-engine/algorithm-engine/algorithm-services";
import { recordDailyShowcase } from "@/modules/dailyShowcase/services/showcase-service";

import type {
  InsertionResult,
  CleanupResult,
  HourlyJobResult,
  DailyJobResult,
} from "./automation-type";

/**
 * Option B architecture: this is a pure *global generator*.
 *
 * It has no notion of users or tiers at generation time. Each hourly run keeps
 * the shared `extensions` pool fresh with basic extensions (tagged
 * `extensionStatus: "basic"`) and cleans up stale ones; the daily run records
 * the showcased set into the `daily_showcase` table.
 *
 * Premium is NOT generated here. It is an on-demand delivery option anchored to
 * the dailyShowcase module: when a verified premium user requests it, the AI
 * brain re-analyses the already-stored extensions' links and returns a richer
 * format. See `getPremiumShowcase()` in the dailyShowcase service.
 */
export class TwentyFourHourAutomation {
  private hourlyCron: { stop: () => void } | null = null;
  private dailyCron: { stop: () => void } | null = null;

  private async insertExtensions(): Promise<InsertionResult> {
    const token = process.env.GITHUB_TOKEN;

    const result = await fetchBasicExtensions({ token });

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
      console.error("[hourly] Insertion step failed", err); /// replace to logging
    }

    try {
      cleanup = await this.cleanup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`cleanup failed: ${msg}`);
      console.error("[hourly] Cleanup step failed", err);
    }

    return { insertion, cleanup, errors };
  }

  async runDailyJob(): Promise<DailyJobResult> {
    try {
      const result = await this.getTwentyFourHourExtensions();
      const count = Array.isArray(result.data) ? result.data.length : 0;

      // Persist the retrieved extensions into the daily showcase table so the
      // frontend can read them back via the `/showcase` endpoint. This logic
      // lives in its own module (dailyShowcase), separate from the generator.
      if (Array.isArray(result.data)) {
        const extensionIds = (result.data as Array<{ id?: unknown }>)
          .map((extension) => extension.id)
          .filter((id): id is string => typeof id === "string");

        await recordDailyShowcase(extensionIds);
      }

      return { success: result.success, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[daily] Extension retrieval failed", err);
      return { success: false, count: 0, error: msg }; // replace menggunakna logging
    }
  } ///  tambahkan untuk push ke label -> jadi nanti tinggal diambil

  startCronJobs() {
    this.hourlyCron = Bun.cron("0 * * * *", async () => {
      const started = Date.now();
      console.log(
        `[hourly] Extension automation started at ${new Date().toISOString()}`,
      ); // logging

      const result = await this.runHourlyJob();

      const duration = ((Date.now() - started) / 1000).toFixed(1);
      console.log("[hourly] Extension automation completed", {
        duration: `${duration}s`,
        inserted: result.insertion?.inserted ?? 0,
        failed: result.insertion?.failed ?? 0,
        skipped: result.insertion?.skipped ?? 0,
        deleted: result.cleanup?.deleted ?? 0,
        errors: result.errors.length > 0 ? result.errors : undefined,
      }); // logging
    });

    this.dailyCron = Bun.cron("0 0 * * *", async () => {
      const started = Date.now();
      console.log(
        `[daily] Extension export started at ${new Date().toISOString()}`,
      ); // logging

      const result = await this.runDailyJob();

      const duration = ((Date.now() - started) / 1000).toFixed(1);
      console.log("[daily] Extension export completed", {
        duration: `${duration}s`,
        success: result.success,
        count: result.count,
        error: result.error,
      }); // logging
    });

    console.log(
      "[cron] Scheduled hourly (0 * * * *) basic generation + cleanup and daily (0 0 * * *) showcase export (global generator, no user context)",
    ); // logging
  }

  stopCronJobs() {
    this.hourlyCron?.stop();
    this.dailyCron?.stop();
    this.hourlyCron = null;
    this.dailyCron = null;
    console.log("[cron] All scheduled jobs stopped");
  }
}
