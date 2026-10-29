/**
 * Removes catalog rows that the scan pipeline never enriched, so every
 * remaining extension is backed by real repository data (description, README
 * snapshot, star count, security score).
 *
 * Dry run: bun run purge:dummy
 * Apply:   bun run purge:dummy -- --yes
 * Also drop the demo package: bun run purge:dummy -- --yes --with-demo
 *
 * Purged repositories are also released from `fetched_repos`, so the hourly
 * job may ingest them again as fully scanned entries.
 */
import { isAbsolute, relative, resolve } from "node:path";
import { rm } from "node:fs/promises";
import { and, count, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { extensions, fetchedRepos } from "@/models";
import { config } from "../config";

const DEMO_DEVELOPER = "premium_demo";
const APPLY = process.argv.includes("--yes");
const WITH_DEMO = process.argv.includes("--with-demo");

// A row the ingest pipeline never scanned: no security score, no star count and
// no README snapshot. Every insert path writes a score, so this cannot match a
// fully processed extension.
const stubFilter = and(
  isNull(extensions.securityScore),
  isNull(extensions.stars),
  isNull(extensions.announcement),
  ne(extensions.developer, DEMO_DEVELOPER),
);

async function main() {
  const rows = await db
    .select({
      id: extensions.id,
      name: extensions.name,
      developer: extensions.developer,
      extensionLink: extensions.extensionLink,
      createdAt: extensions.createdAt,
    })
    .from(extensions)
    .where(
      WITH_DEMO
        ? or(stubFilter, eq(extensions.developer, DEMO_DEVELOPER))
        : stubFilter,
    );

  const [total] = await db.select({ total: count() }).from(extensions);

  console.log(`Catalog size: ${total.total} | candidates: ${rows.length}`);

  for (const row of rows) {
    console.log(
      `  - ${row.name} (${row.developer}, created ${row.createdAt.toISOString().slice(0, 10)})`,
    );
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with `-- --yes` to delete these rows.");
    process.exit(0);
  }

  const uploadRoot = resolve(config.uploadDir);
  const removedPackages: string[] = [];

  for (const row of rows) {
    const storedPath = resolve(row.extensionLink);
    const inside = relative(uploadRoot, storedPath);

    if (inside.length > 0 && !inside.startsWith("..") && !isAbsolute(inside)) {
      await rm(storedPath, { force: true });
      removedPackages.push(row.name);
    }
  }

  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(extensions).where(inArray(extensions.id, ids));
  }

  const repoNames = rows
    .map((row) => row.name)
    .filter((name) => name.includes("/"));
  if (repoNames.length > 0) {
    await db
      .delete(fetchedRepos)
      .where(inArray(fetchedRepos.repoName, repoNames));
  }

  console.log(
    `\nDeleted ${ids.length} rows, released ${repoNames.length} repos, removed ${removedPackages.length} package files.`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
