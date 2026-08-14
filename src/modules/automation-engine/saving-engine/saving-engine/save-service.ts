import {
  createExtension,
  updateExtension,
  deleteExtension,
  createFetchedRepo,
  findExtensionByNameAndDeveloper,
} from "../repository/saving-repository";
import type { ExtensionRepo } from "../../github-explorer/api-engine";
import type { Category } from "../../db/schema";
import { AppError } from "@/middlewares/errorHandler";
import { validateExtensionRepo } from "../../depends/extension-utils";

export interface InsertFromGithubOptions {
  categories?: Category[];
}

export interface UpdateExtensionOptions {
  id: string;
  data: {
    name?: string;
    description?: string;
    developer?: string;
    extensionLink?: string;
    categories?: Category[];
  };
}

export interface InsertGithubResult {
  inserted: number;
  failed: number;
  skipped: number;
  failures: Array<{ name: string; reason: string }>;
}

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function markRepoAsFetched(sourceRepoName?: string) {
  if (!sourceRepoName) return;
  await createFetchedRepo(sourceRepoName);
}

export async function insertExtensionsFromGithub(
  repos: ExtensionRepo[],
): Promise<EngineResult<InsertGithubResult>> {
  let inserted = 0;
  let failed = 0;
  let skipped = 0;
  const failures: InsertGithubResult["failures"] = [];

  for (const repo of repos) {
    const validated = validateExtensionRepo(repo);

    if (!validated.valid) {
      failed++;
      failures.push({ name: repo.name ?? "unknown", reason: validated.reason });
      continue;
    }

    const normalized = validated.data;

    try {
      const existing = await findExtensionByNameAndDeveloper(
        normalized.name,
        normalized.publisher,
      );

      if (existing) {
        skipped++;
        await markRepoAsFetched(normalized.sourceRepoName);
        continue;
      }

      await createExtension({
        name: normalized.name,
        description: normalized.description,
        developer: normalized.publisher,
        extensionLink: normalized.downloadUrl,
        source: "github",
        categories: normalized.category,
        extensionStatus: normalized.extensionStatus ?? "basic",
        verified: normalized.verified ?? "not_verified",
        verificationPercentage: normalized.verificationPercentage ?? 0,
        permissions: normalized.permissions,
      });

      await markRepoAsFetched(normalized.sourceRepoName);
      inserted++;
    } catch (error) {
      failed++;
      const reason =
        error instanceof Error ? error.message : "unknown insert error";
      failures.push({ name: normalized.name, reason });
      console.error(`Failed to insert extension "${normalized.name}"`, {
        statusCode: 500,
        cause: error,
      });
    }
  }

  return {
    success: failed === 0,
    data: {
      inserted,
      failed,
      skipped,
      failures,
    },
  };
}

export async function updateExtensionById(
  options: UpdateExtensionOptions,
): Promise<EngineResult<unknown>> {
  try {
    const {
      id,
      data: { categories, ...rest },
    } = options;

    const updated = await updateExtension({
      id,
      data: rest,
      categories,
    });

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to update extension`, 500, { cause: err });
  }
}

export async function deleteExtensionById(
  id: string,
): Promise<EngineResult<unknown>> {
  try {
    const deleted = await deleteExtension(id);
    return { success: true, data: deleted };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to delete extension`, 500, { cause: err });
  }
}
