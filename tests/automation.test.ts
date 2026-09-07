// ── TwentyFourHour Automation Tests ─────────────────────────────────────────
// Tests the automation class methods directly (no HTTP layer needed).
//
// Prerequisites:
//   1. Database migrated                (bun run migrate)
//   2. GITHUB_TOKEN set in .env         (for GitHub API calls)
//   3. AUTOMATION_USER_ID in .env       (optional – falls back to FREE_USER_ID)
//
// Run:  bun test tests/automation.test.ts

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import * as dotenv from "dotenv";
import {
  TwentyFourHourAutomation,
  FREE_USER_ID,
  isFreeUser,
  resolveUserId,
  type HourlyJobResult,
  type DailyJobResult,
} from "../src/modules/twentyFourHour/extension-automation";

dotenv.config();

const TEST_USER_ID = resolveUserId(process.env.AUTOMATION_USER_ID);

let automation: TwentyFourHourAutomation;

// ── Class instantiation ─────────────────────────────────────────────────────

describe("TwentyFourHourAutomation – instantiation", () => {
  test("should create an instance with a userId", () => {
    automation = new TwentyFourHourAutomation(TEST_USER_ID);
    expect(automation).toBeDefined();
    expect(automation).toBeInstanceOf(TwentyFourHourAutomation);
  });
});

// ── Free userId fallback (visitors with no login/registration) ──────────────

describe("free userId fallback", () => {
  const REAL_USER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

  test("FREE_USER_ID is a valid uuid the module itself accepts", () => {
    // Round-trips through the production validator instead of duplicating the
    // uuid pattern here, so this assertion cannot drift from the real one.
    expect(resolveUserId(FREE_USER_ID)).toBe(FREE_USER_ID);
    expect(isFreeUser(FREE_USER_ID)).toBe(true);
  });

  test("an unset or empty FREE_USER_ID env var degrades to the nil uuid", () => {
    const configured = process.env.FREE_USER_ID?.trim() ?? "";

    if (configured === "") {
      expect(FREE_USER_ID).toBe("00000000-0000-0000-0000-000000000000");
    } else {
      expect(resolveUserId(FREE_USER_ID)).toBe(FREE_USER_ID);
    }
  });

  test("an empty cookie resolves to the free userId", () => {
    expect(resolveUserId({})).toBe(FREE_USER_ID);
    expect(resolveUserId({ accountId: "" })).toBe(FREE_USER_ID);
    expect(resolveUserId(null)).toBe(FREE_USER_ID);
    expect(resolveUserId(undefined)).toBe(FREE_USER_ID);
    expect(resolveUserId("")).toBe(FREE_USER_ID);
  });

  test("a malformed accountId resolves to the free userId", () => {
    expect(resolveUserId({ accountId: "not-a-uuid" })).toBe(FREE_USER_ID);
    expect(resolveUserId({ accountId: "'; DROP TABLE accounts;--" })).toBe(
      FREE_USER_ID,
    );
  });

  test("a logged-in accountId cookie is preserved", () => {
    expect(resolveUserId({ accountId: REAL_USER_ID })).toBe(REAL_USER_ID);
    expect(resolveUserId(REAL_USER_ID)).toBe(REAL_USER_ID);
  });

  test("an Elysia-style cookie object is unwrapped via String()", () => {
    const jar = { accountId: { toString: () => REAL_USER_ID } };
    expect(resolveUserId(jar)).toBe(REAL_USER_ID);
  });

  test("isFreeUser only matches the free userId", () => {
    expect(isFreeUser(FREE_USER_ID)).toBe(true);
    expect(isFreeUser(REAL_USER_ID)).toBe(false);
  });

  test("the class falls back to the free tier without a userId", () => {
    expect(new TwentyFourHourAutomation().isFreeUser).toBe(true);
    expect(new TwentyFourHourAutomation("").isFreeUser).toBe(true);
    expect(new TwentyFourHourAutomation(REAL_USER_ID).isFreeUser).toBe(false);
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
    const result = await automation.runHourlyJob();

    // Should not throw – errors are collected
    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("an invalid user id degrades to the free tier instead of erroring", async () => {
    const badAutomation = new TwentyFourHourAutomation("invalid-uuid");
    expect(badAutomation.isFreeUser).toBe(true);

    const result = await badAutomation.runHourlyJob();

    expect(result).toBeDefined();
    if (result.insertion) {
      expect(result.insertion.isPremium).toBe(false);
    }
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
