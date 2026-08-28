import { hasActiveSubscription } from "@/middlewares/premium-middleware";
import { fetchBrowserExtensions as fetchBasicExtensions } from "@/modules/automation-engine/github-explorer/api-engine";
import { fetchBrowserExtensions as fetchPremiumExtensions } from "@/modules/automation-engine/premium-engine/github-engine/github-searching";
import { cleanupStaleExtensions } from "@/modules/automation-engine/filtering-engine/filtering-engine/cleanup-engine";
import {
  getExtensions,
  type EngineResult,
} from "@/modules/automation-engine/algorithm-engine/algorithm-engine/algorithm-services";

export interface InsertionResult {
  isPremium: boolean;
  inserted: number;
  failed: number;
  skipped: number;
  failures: Array<{ name: string; reason: string }>;
}

export interface CleanupResult {
  deleted: number;
}

export interface HourlyJobResult {
  insertion: InsertionResult | null;
  cleanup: CleanupResult | null;
  errors: string[];
}

export interface DailyJobResult {
  success: boolean;
  count: number;
  error?: string;
}

export class TwentyFourHourAutomation {
  private hourlyCron: { stop: () => void } | null = null;
  private dailyCron: { stop: () => void } | null = null;

  constructor(private readonly userId: string) {}

  private async insertGitHubExtensions(): Promise<InsertionResult> {
    // tambahkan jika cookie belum terisi maka isi dengan false
    const isPremium = await hasActiveSubscription(this.userId);
    const token = process.env.GITHUB_TOKEN;

    const result = isPremium
      ? await fetchPremiumExtensions({ token })
      : await fetchBasicExtensions({ token });

    const insertResult = result.data.insertResult;

    return {
      isPremium,
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
      insertion = await this.insertGitHubExtensions();
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

      return { success: result.success, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[daily] Extension retrieval failed", err);
      return { success: false, count: 0, error: msg }; // replace menggunakna logging
    }
  } ///  tambahkan untuk push ke label

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
        tier: result.insertion?.isPremium ? "premium" : "basic",
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
      `[cron] Scheduled hourly (0 * * * *) and daily (0 0 * * *) jobs for user ${this.userId}`,
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
