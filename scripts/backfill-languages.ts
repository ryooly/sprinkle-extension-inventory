/**
 * Re-detects the frontend/backend language split for automation rows whose
 * columns are still null: either the GitHub call failed at save time (it used
 * to swallow the error) or the language was not in the classifier yet.
 *
 * Dry run: bun run backfill:languages
 * Apply:   bun run backfill:languages -- --yes
 * Re-scan rows that already carry both lists: add --force
 */
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { extensions } from "@/models";
import { ExtensionUtils } from "@/modules/automation-engine/depends/extension-utils";
import { updateExtension } from "@/modules/automation-engine/saving-engine/repository/saving-repository";

const APPLY = process.argv.includes("--yes");
const FORCE = process.argv.includes("--force");
const PAUSE_MS = 400;

function toOwnerRepo(name: string): { owner: string; repo: string } | null {
  const separator = name.indexOf("/");

  if (separator <= 0 || separator === name.length - 1) return null;

  return {
    owner: name.slice(0, separator),
    repo: name.slice(separator + 1),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function printing(languages: string[]): string {
  return languages.length > 0 ? languages.join(", ") : "-";
}

async function main() {
  const rows = await db
    .select()
    .from(extensions)
    .where(
      FORCE
        ? eq(extensions.publishedBy, "automation")
        : and(
            eq(extensions.publishedBy, "automation"),
            or(
              isNull(extensions.frontendLanguages),
              isNull(extensions.backendLanguages),
            ),
          ),
    )
    .orderBy(extensions.name);

  console.log(
    `${rows.length} row(s) queued · apply=${APPLY} · force=${FORCE} ·` +
      ` github token=${Boolean(process.env.GITHUB_TOKEN)}`,
  );

  const ext = new ExtensionUtils();
  let detected = 0;
  let updated = 0;
  let unchanged = 0;
  const failures: Array<{ name: string; reason: string }> = [];

  for (const row of rows) {
    const parsed = toOwnerRepo(row.name);

    if (!parsed) {
      failures.push({ name: row.name, reason: "not an owner/repo name" });
      continue;
    }

    try {
      const [frontend, backend] = await ext.detectLanguages(
        parsed.owner,
        parsed.repo,
      );

      await sleep(PAUSE_MS);

      if (frontend.length === 0 && backend.length === 0) {
        unchanged++;
        console.log(`${row.name}: nothing detected, left untouched`);
        continue;
      }

      detected++;
      console.log(
        `${row.name}: frontend=${printing(frontend)} · backend=${printing(backend)}`,
      );

      if (!APPLY) continue;

      await updateExtension({
        id: row.id,
        data: {
          frontendLanguages:
            frontend.length > 0 ? frontend : row.frontendLanguages,
          backendLanguages:
            backend.length > 0 ? backend : row.backendLanguages,
        },
      });
      updated++;
    } catch (error) {
      failures.push({
        name: row.name,
        reason: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  console.log(
    `\ndetected=${detected} written=${updated} nothing-detected=${unchanged}` +
      ` failed=${failures.length}${APPLY ? "" : " (dry run — nothing written)"}`,
  );

  for (const failure of failures) {
    console.log(`  ! ${failure.name}: ${failure.reason}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
