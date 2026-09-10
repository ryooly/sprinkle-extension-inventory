import { fetchBrowserExtensions as fetchBasicExtensions } from "@/modules/automation-engine/github-explorer/api-engine";
import { fetchBrowserExtensions as fetchPremiumExtensions } from "@/modules/automation-engine/premium-engine/github-engine/github-searching";
import { cleanupStaleExtensions } from "@/modules/automation-engine/filtering-engine/filtering-engine/cleanup-engine";
import {
  getExtensions,
  type EngineResult,
} from "@/modules/automation-engine/algorithm-engine/algorithm-engine/algorithm-services";
import { recordDailyShowcase } from "@/modules/dailyShowcase/services/showcase-service";

import type {
  ExtensionTier,
  InsertionResult,
  CleanupResult,
  HourlyJobResult,
  DailyJobResult,
} from "./automation-type";

/**
 * Option B architecture: this is a pure *global generator*.
 *
 * It has no notion of users or tiers at generation time. On every hourly run
 * it refreshes BOTH pools in the shared `extensions` table:
 *   - basic   -> tagged `extensionStatus: "basic"`
 *   - premium -> tagged `extensionStatus: "premium"` (via the AI engine)
 *
 * Which pool a given visitor sees (guest/free vs premium) is decided later, at
 * the delivery/API layer, from that requester's own subscription. See
 * `getExtensions()` / `getPremiumEkstension()` in the algorithm-services.
 */
export class TwentyFourHourAutomation {
  private hourlyCron: { stop: () => void } | null = null;
  private dailyCron: { stop: () => void } | null = null;

  private async insertExtensions(
    tier: ExtensionTier,
  ): Promise<InsertionResult> {
    const token = process.env.GITHUB_TOKEN;

    const result =
      tier === "premium"
        ? await fetchPremiumExtensions({ token })
        : await fetchBasicExtensions({ token });

    const insertResult = result.data.insertResult;

    return {
      tier,
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
    let basic: InsertionResult | null = null;
    let premium: InsertionResult | null = null;
    let cleanup: CleanupResult | null = null;

    try {
      basic = await this.insertExtensions("basic");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`basic insertion failed: ${msg}`);
      console.error("[hourly] Basic insertion step failed", err); /// replace to logging
    }

    try {
      premium = await this.insertExtensions("premium"); /// karena kebutuhan token jadi gw gakbisa asal tambahkan keduanya sekaligus
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`premium insertion failed: ${msg}`);
      console.error("[hourly] Premium insertion step failed", err); /// replace to logging
    }

    try {
      cleanup = await this.cleanup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`cleanup failed: ${msg}`);
      console.error("[hourly] Cleanup step failed", err);
    }

    return { basic, premium, cleanup, errors };
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
        basicInserted: result.basic?.inserted ?? 0,
        premiumInserted: result.premium?.inserted ?? 0,
        failed: (result.basic?.failed ?? 0) + (result.premium?.failed ?? 0),
        skipped: (result.basic?.skipped ?? 0) + (result.premium?.skipped ?? 0),
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
      "[cron] Scheduled hourly (0 * * * *) basic+premium generation and daily (0 0 * * *) export jobs (global generator, no user context)",
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
