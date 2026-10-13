import { describe, expect, test, beforeAll } from "bun:test";
import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "../src/modules/twentyFourHour/extension-automation";
import type {
  HourlyJobResult,
  DailyJobResult,
} from "../src/modules/twentyFourHour/automation-type";

dotenv.config();

let automation: TwentyFourHourAutomation;

describe("TwentyFourHourAutomation – instantiation", () => {
  test("should create an instance without any user context", () => {
    automation = new TwentyFourHourAutomation();
    expect(automation).toBeDefined();
    expect(automation).toBeInstanceOf(TwentyFourHourAutomation);
  });
});

describe("TwentyFourHourAutomation – runHourlyJob", () => {
  beforeAll(() => {
    automation = new TwentyFourHourAutomation();
  });

  test("should return a structured HourlyJobResult", async () => {
    const result: HourlyJobResult = await automation.runHourlyJob();

    expect(result).toHaveProperty("insertion");
    expect(result).toHaveProperty("cleanup");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("insertion result should have the expected fields when successful", async () => {
    const result = await automation.runHourlyJob();

    if (result.insertion) {
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

    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

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

describe("TwentyFourHourAutomation – cron lifecycle", () => {
  test("startCronJobs should not throw", () => {
    const instance = new TwentyFourHourAutomation();
    expect(() => instance.startCronJobs()).not.toThrow();
    instance.stopCronJobs();
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
