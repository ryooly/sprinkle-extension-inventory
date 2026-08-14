import { Octokit } from "@octokit/rest";
import { Category, VerificationStatus, BrowserPermission, ExtensionStatus } from "../db/schema";
import { AppError } from "@/middlewares/errorHandler";
import { topicToCategory } from "../depends/topics-libary";
import { insertExtensionsFromGithub } from "../saving-engine/saving-engine/save-service";
import type { InsertGithubResult } from "../saving-engine/saving-engine/save-service";
import {
  buildGithubSearchQuery,
  buildGithubZipUrl,
} from "../depends/extension-utils";
import {
  isRepoAlreadyProcessed,
  paginateGithubSearch,
} from "../depends/github-search-utils";

export interface ExtensionRepo {
  name: string;
  publisher: string;
  description: string;
  downloadUrl: string;
  category: Category[];
  sourceRepoName?: string;
  extensionStatus?: ExtensionStatus;
  verified?: VerificationStatus;
  verificationPercentage?: number;
  permissions?: BrowserPermission[];
}

export interface SearchOptions {
  query?: string;
  perPage?: number;
  minStars?: number;
  token?: string;
}

interface ServiceResult<TData = unknown> {
  success: boolean;
  data: {
    insertResult: InsertGithubResult;
    data: TData;
  };
}

export interface ExtensionImportResult {
  insertResult: InsertGithubResult;
  data: ExtensionRepo[];
}

function inferCategoriesFromTopics(topics: string[]): Category[] {
  const categories = new Set<Category>();

  for (const topic of topics) {
    const category = topicToCategory[topic];
    if (category) categories.add(category);
  }

  if (categories.size === 0) {
    categories.add("other");
  }

  return Array.from(categories);
}

async function toExtensionRepo(
  item: Record<string, unknown>,
): Promise<ExtensionRepo | null> {
  const fullName = String(item.full_name);
  const htmlUrl = String(item.html_url);
  const description = String(item.description).trim();

  if (await isRepoAlreadyProcessed(fullName)) return null;

  const owner = item.owner as { login?: string } | undefined;

  return {
    name: fullName,
    publisher: owner?.login ?? fullName.split("/")[0] ?? "unknown",
    description,
    downloadUrl: buildGithubZipUrl(htmlUrl, item.default_branch as string | null),
    category: inferCategoriesFromTopics((item.topics as string[]) ?? []),
    sourceRepoName: fullName,
    extensionStatus: "basic",
  };
}

export async function fetchBrowserExtensions(
  options: SearchOptions = {},
): Promise<ServiceResult> {
  const { query = "", perPage = 5, minStars = 10, token } = options;

  const octokit = new Octokit({ auth: token });
  const searchQuery = buildGithubSearchQuery(query, minStars);

  try {
    const results = await paginateGithubSearch(
      octokit,
      searchQuery,
      perPage,
      toExtensionRepo,
    );

    const insertResult = await insertExtensionsFromGithub(results);

    return {
      success: insertResult.success,
      data: {
        insertResult: insertResult.data!,
        data: results,
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions from GitHub`, 500, {
      cause: err,
    });
  }
}
