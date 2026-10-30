/**
 * Backfills the safety signals the extension page renders but that older scan
 * passes never persisted: the security breakdown, risk list, per-endpoint Safe
 * Browsing verdicts, browser permissions and the repository trust rating.
 *
 * Dry run: bun run backfill:safety
 * Apply:   bun run backfill:safety -- --yes
 * Re-scan rows that already carry the fields: add --force
 *
 * GitHub-sourced rows are re-enriched through the same utils the hourly job
 * uses, so the score is recomputed together with its breakdown and stays
 * internally consistent. Uploaded rows have no repository to visit, so only
 * their stored endpoints and permissions are re-scored.
 */
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { extensionPermissions, extensions } from "@/models";
import type { BrowserPermission, Extension } from "@/models";
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

async function loadPermissions(id: string): Promise<BrowserPermission[]> {
  const rows = await db
    .select({ permission: extensionPermissions.permission })
    .from(extensionPermissions)
    .where(eq(extensionPermissions.extensionId, id));

  return rows.map((row) => row.permission);
}

async function backfillGithubRow(
  ext: ExtensionUtils,
  row: Extension,
): Promise<void> {
  const parsed = toOwnerRepo(row.name);

  if (!parsed) throw new Error(`"${row.name}" is not an owner/repo name`);

  const { owner, repo } = parsed;
  const permissions = await ext.detectManifestPermissions(owner, repo);
  const metrics = await ext.getRepositoryMetrics(owner, repo);
  const defaultBranch = ext.parseZipUrl(row.extensionLink)?.defaultBranch;
  const endpoints = await ext.findApi(owner, repo, defaultBranch);
  const security = ext.computeSecurityScore({ endpoints, permissions });
  const rating = ext.rateRepository(metrics);

  console.log(
    `${row.name}: score ${row.securityScore ?? "-"} → ${security.score}` +
      ` · endpoints=${endpoints.length} · permissions=${permissions.length}` +
      ` · grade=${rating.grade}`,
  );

  if (!APPLY) return;

  await updateExtension({
    id: row.id,
    data: {
      apiEndpoints:
        endpoints.length > 0
          ? endpoints.map((e) => `${e.type}:${e.method} ${e.path}`)
          : null,
      endpointSafety:
        endpoints.length > 0
          ? endpoints.map((e) => ({
              type: e.type,
              file: e.file,
              method: e.method,
              path: e.path,
              safe: e.security.safe,
              threats: e.security.threats.map((threat) => ({
                threatType: threat.threatType,
                platformType: threat.platformType,
                threatEntryType: threat.threatEntryType,
              })),
              checkedAt: e.security.checkedAt,
              skippedOnError: e.security.skippedOnError,
            }))
          : null,
      securityScore: security.score,
      securityBreakdown: security.breakdown,
      securityRisks: security.risks,
      repoGrade: rating.grade,
      repoRating: { totalScore: rating.totalScore, breakdown: rating.breakdown },
    },
    permissions,
  });
}

async function backfillStoredRow(
  ext: ExtensionUtils,
  row: Extension,
): Promise<void> {
  const permissions = await loadPermissions(row.id);
  const security = ext.computeSecurityScore({
    endpoints: row.apiEndpoints ?? [],
    permissions,
  });

  console.log(
    `${row.name}: score ${row.securityScore ?? "-"} → ${security.score}` +
      ` · stored endpoints=${row.apiEndpoints?.length ?? 0}` +
      ` · permissions=${permissions.length} (offline)`,
  );

  if (!APPLY) return;

  await updateExtension({
    id: row.id,
    data: {
      securityScore: security.score,
      securityBreakdown: security.breakdown,
      securityRisks: security.risks,
    },
  });
}

async function main() {
  const rows = await db
    .select()
    .from(extensions)
    .where(FORCE ? undefined : isNull(extensions.securityBreakdown))
    .orderBy(extensions.name);

  console.log(
    `${rows.length} row(s) queued · apply=${APPLY} · force=${FORCE} ·` +
      ` github token=${Boolean(process.env.GITHUB_TOKEN)}`,
  );

  const ext = new ExtensionUtils();
  let updated = 0;
  let rescored = 0;
  const failures: Array<{ name: string; reason: string }> = [];

  for (const row of rows) {
    const online = row.publishedBy === "automation" && row.name.includes("/");

    try {
      if (online) {
        await backfillGithubRow(ext, row);
        updated++;
        await sleep(PAUSE_MS);
      } else {
        await backfillStoredRow(ext, row);
        rescored++;
      }
    } catch (error) {
      failures.push({
        name: row.name,
        reason: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  console.log(
    `\nre-scanned=${updated} re-scored=${rescored} failed=${failures.length}` +
      `${APPLY ? "" : " (dry run — nothing written)"}`,
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
