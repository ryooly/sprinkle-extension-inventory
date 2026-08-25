// ── TwentyFourHour Automation Tests ─────────────────────────────────────────
// Tests the automation class methods directly (no HTTP layer needed).
//
// Prerequisites:
//   1. Database migrated                (bun run migrate)
//   2. GITHUB_TOKEN set in .env         (for GitHub API calls)
//   3. AUTOMATION_USER_ID set in .env   (valid account UUID in the database)
//
// Run:  bun test tests/automation.test.ts

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import * as dotenv from "dotenv";
import {
  TwentyFourHourAutomation,
  type HourlyJobResult,
  type DailyJobResult,
} from "../src/modules/twentyFourHour/extension-automation";

dotenv.config();

const TEST_USER_ID =
  process.env.AUTOMATION_USER_ID ?? "00000000-0000-0000-0000-000000000000";

let automation: TwentyFourHourAutomation;

// ── Class instantiation ─────────────────────────────────────────────────────

describe("TwentyFourHourAutomation – instantiation", () => {
  test("should create an instance with a userId", () => {
    automation = new TwentyFourHourAutomation(TEST_USER_ID);
    expect(automation).toBeDefined();
    expect(automation).toBeInstanceOf(TwentyFourHourAutomation);
  });
});

// ── Hourly job (insertion + cleanup) ────────────────────────────────────────

describe("TwentyFourHourAutomation – runHourlyJob", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation(TEST_USER_ID);
  });

  test("should return a structured HourlyJobResult", async () => {
    const result: HourlyJobResult = await automation.runHourlyJob();

    // Top-level shape
    expect(result).toHaveProperty("insertion");
    expect(result).toHaveProperty("cleanup");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("insertion result should have expected fields when successful", async () => {
    const result = await automation.runHourlyJob();

    if (result.insertion) {
      expect(typeof result.insertion.isPremium).toBe("boolean");
      expect(typeof result.insertion.inserted).toBe("number");
      expect(typeof result.insertion.failed).toBe("number");
      expect(typeof result.insertion.skipped).toBe("number");
      expect(Array.isArray(result.insertion.failures)).toBe(true);
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
    // Use a clearly invalid user ID to trigger errors
    const badAutomation = new TwentyFourHourAutomation("invalid-uuid");
    const result = await badAutomation.runHourlyJob();

    // Should not throw – errors are collected
    expect(result).toBeDefined();
    expect(result.insertion).toBeNull();
  });
});

// ── Daily job (retrieve extensions) ─────────────────────────────────────────

describe("TwentyFourHourAutomation – runDailyJob", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation(TEST_USER_ID);
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
    automation = new TwentyFourHourAutomation(TEST_USER_ID);
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
    const instance = new TwentyFourHourAutomation(TEST_USER_ID);
    expect(() => instance.startCronJobs()).not.toThrow();
    instance.stopCronJobs(); // cleanup immediately
  });

  test("stopCronJobs should be callable even without starting", () => {
    const instance = new TwentyFourHourAutomation(TEST_USER_ID);
    expect(() => instance.stopCronJobs()).not.toThrow();
  });

  test("startCronJobs then stopCronJobs should not throw", () => {
    const instance = new TwentyFourHourAutomation(TEST_USER_ID);
    instance.startCronJobs();
    expect(() => instance.stopCronJobs()).not.toThrow();
  });
});
