import { describe, expect, test } from "bun:test";
import * as dotenv from "dotenv";
import { desc, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { extensions } from "../src/models";
import { TwentyFourHourAutomation } from "../src/modules/twentyFourHour/extension-automation";
import type { HourlyJobResult } from "../src/modules/twentyFourHour/automation-type";

dotenv.config();

// One full ingest + cleanup pass talks to the live GitHub search API and the
// database, so give it far more room than the default per-test budget.
const RUN_TIMEOUT_MS = 180_000;

async function readStored(count: number) {
  return await db
    .select({
      id: extensions.id,
      name: extensions.name,
      developer: extensions.developer,
      source: extensions.source,
      status: extensions.extensionStatus,
      stars: extensions.stars,
      securityScore: extensions.securityScore,
      repoGrade: extensions.repoGrade,
      downloads: extensions.downloads,
      createdAt: extensions.createdAt,
    })
    .from(extensions)
    .where(eq(extensions.publishedBy, "automation"))
    .orderBy(desc(extensions.createdAt))
    .limit(Math.max(1, count));
}

describe("Automation review – run once, store, display", () => {
  test(
    "runs a single automation pass, persists it, and prints the stored rows for review",
    async () => {
      const automation = new TwentyFourHourAutomation();

      const result: HourlyJobResult = await automation.runHourlyJob();

      console.log(
        "[automation-review] run summary:",
        JSON.stringify(
          {
            inserted: result.insertion?.inserted ?? 0,
            failed: result.insertion?.failed ?? 0,
            skipped: result.insertion?.skipped ?? 0,
            deleted: result.cleanup?.deleted ?? 0,
            errors: result.errors,
          },
          null,
          2,
        ),
      );

      expect(result).toHaveProperty("insertion");
      expect(result).toHaveProperty("cleanup");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toEqual([]);

      const insertedCount = result.insertion?.inserted ?? 0;
      const rows = await readStored(insertedCount);

      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThanOrEqual(0);

      // The rows just written should now be readable back out of the database.
      if (insertedCount > 0) {
        expect(rows.length).toBeGreaterThan(0);
        console.table(
          rows.map((row) => ({
            name: row.name,
            developer: row.developer,
            source: row.source,
            status: row.status,
            stars: row.stars ?? 0,
            security: row.securityScore ?? "-",
            grade: row.repoGrade ?? "-",
            listed: row.createdAt?.toISOString?.() ?? "",
          })),
        );
      } else {
        console.log(
          "[automation-review] no new rows were inserted this run " +
            "(everything was already catalogued or skipped).",
        );
      }
    },
    RUN_TIMEOUT_MS,
  );
});
