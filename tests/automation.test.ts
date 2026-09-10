// ── TwentyFourHour Automation Tests ─────────────────────────────────────────
// Tests the automation class methods directly (no HTTP layer needed).
//
// Option B architecture: the automation is a pure *global generator*. It has
// no user/tier context; each hourly run refreshes both the `basic` and
// `premium` pools in the shared extensions table. Tiering happens later, at
// the delivery/API layer.
//
// Prerequisites:
//   1. Database migrated                (bun run migrate)
//   2. GITHUB_TOKEN set in .env         (for GitHub API calls)
//
// Run:  bun test tests/automation.test.ts

import { describe, expect, test, beforeAll } from "bun:test";
import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "../src/modules/twentyFourHour/extension-automation";
import type {
  HourlyJobResult,
  DailyJobResult,
} from "../src/modules/twentyFourHour/automation-type";

dotenv.config();

let automation: TwentyFourHourAutomation;

// ── Class instantiation ─────────────────────────────────────────────────────

describe("TwentyFourHourAutomation – instantiation", () => {
  test("should create an instance without any user context", () => {
    automation = new TwentyFourHourAutomation();
    expect(automation).toBeDefined();
    expect(automation).toBeInstanceOf(TwentyFourHourAutomation);
  });
});

// ── Hourly job (basic + premium insertion + cleanup) ────────────────────────

describe("TwentyFourHourAutomation – runHourlyJob", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation();
  });

  test("should return a structured HourlyJobResult", async () => {
    const result: HourlyJobResult = await automation.runHourlyJob();

    // Top-level shape
    expect(result).toHaveProperty("basic");
    expect(result).toHaveProperty("premium");
    expect(result).toHaveProperty("cleanup");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("basic and premium insertion results should be tagged with their tier", async () => {
    const result = await automation.runHourlyJob();

    if (result.basic) {
      expect(result.basic.tier).toBe("basic");
      expect(typeof result.basic.inserted).toBe("number");
      expect(typeof result.basic.failed).toBe("number");
      expect(typeof result.basic.skipped).toBe("number");
      expect(Array.isArray(result.basic.failures)).toBe(true);
    }

    if (result.premium) {
      expect(result.premium.tier).toBe("premium");
      expect(typeof result.premium.inserted).toBe("number");
      expect(typeof result.premium.failed).toBe("number");
      expect(typeof result.premium.skipped).toBe("number");
      expect(Array.isArray(result.premium.failures)).toBe(true);
    }
  });

  test("cleanup result should have deleted count", async () => {
    const result = await automation.runHourlyJob();

    if (result.cleanup) {
      expect(typeof result.cleanup.deleted).toBe("number");
      expect(result.cleanup.deleted).toBeGreaterThanOrEqual(0);
    }
  });

  test("should collect errors instead of throwing", async () => {
    const result = await automation.runHourlyJob();

    // Should not throw – errors are collected
    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ── Daily job (retrieve extensions) ─────────────────────────────────────────

describe("TwentyFourHourAutomation – runDailyJob", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation();
  });

  test("should return a DailyJobResult with success and count", async () => {
    const result: DailyJobResult = await automation.runDailyJob();

    expect(typeof result.success).toBe("boolean");
    expect(typeof result.count).toBe("number");
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  test("should not throw even if data is empty", async () => {
    const result = await automation.runDailyJob();

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });
});

// ── getTwentyFourHourExtensions ─────────────────────────────────────────────

describe("TwentyFourHourAutomation – getTwentyFourHourExtensions", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation();
  });

  test("should return EngineResult with success flag", async () => {
    const result = await automation.getTwentyFourHourExtensions();

    expect(typeof result.success).toBe("boolean");

    if (result.success) {
      expect(result.data).toBeDefined();
    }
  });
});

// ── Cron lifecycle ──────────────────────────────────────────────────────────

describe("TwentyFourHourAutomation – cron lifecycle", () => {
  test("startCronJobs should not throw", () => {
    const instance = new TwentyFourHourAutomation();
    expect(() => instance.startCronJobs()).not.toThrow();
    instance.stopCronJobs(); // cleanup immediately
  });

  test("stopCronJobs should be callable even without starting", () => {
    const instance = new TwentyFourHourAutomation();
    expect(() => instance.stopCronJobs()).not.toThrow();
  });

  test("startCronJobs then stopCronJobs should not throw", () => {
    const instance = new TwentyFourHourAutomation();
    instance.startCronJobs();
    expect(() => instance.stopCronJobs()).not.toThrow();
  });
});
