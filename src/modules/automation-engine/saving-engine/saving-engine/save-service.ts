import {
  createExtension,
  updateExtension,
  deleteExtension,
} from "../repository/saving-repository";
import type { ExtensionRepo } from "../../github-explorer/api-engine";
import type { Category } from "../../db/schema";
import { AppError } from "@/middlewares/errorHandler";

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

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function insertExtensionsFromGithub(
  repos: ExtensionRepo[],
): Promise<EngineResult<{ inserted: number; failed: number }>> {
  let inserted = 0;
  let failed = 0;

  for (const repo of repos) {
    try {
      await createExtension({
        name: repo.name,
        description: repo.description,
        developer: repo.publisher,
        extensionLink: repo.downloadUrl,
        source: "github",
        categories: repo.category ?? [],
      });

      inserted++;
    } catch (error) {
      failed++;
      console.error(`Failed to insert extension "${repo.name}"`, {
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
