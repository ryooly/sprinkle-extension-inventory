import { Octokit } from "@octokit/rest";

import { AppError } from "@/middlewares/errorHandler";

import {
  GithubAIEngine,
  GeminiBrowsingProvider,
} from "../ai-engine/gpt.engine";

import { insertExtensionsFromGithub } from "../../saving-engine/saving-engine/save-service";

import type { InsertGithubResult } from "../../saving-engine/saving-engine/save-service";

import { buildGithubSearchQuery } from "../../depends/extension-utils";

import {
  isRepoAlreadyProcessed,
  paginateGithubSearch,
} from "../../depends/github-search-utils";

import type { RepoCandidateContext } from "../../depends/ai-response-mapper";

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

async function toRepoCandidate(
  item: Record<string, unknown>,
): Promise<RepoCandidateContext | null> {
  const fullName = String(item.full_name);

  if (await isRepoAlreadyProcessed(fullName)) return null;

  return {
    link: String(item.html_url),

    fullName,

    defaultBranch: String(item.default_branch ?? "main"),
  };
}

export async function fetchBrowserExtensions(
  options: SearchOptions = {},
): Promise<ServiceResult> {
  const { query = "", perPage = 20, minStars = 10, token } = options;

  const octokit = new Octokit({ auth: token });

  const searchQuery = buildGithubSearchQuery(query, minStars);

  try {
    const candidates = await paginateGithubSearch(
      octokit,

      searchQuery,

      perPage,

      toRepoCandidate,
    );

    if (candidates.length === 0) {
      return {
        success: true,

        data: {
          insertResult: {
            inserted: 0,

            failed: 0,

            skipped: 0,

            failures: [],
          },

          data: [],
        },
      };
    }

    const provider = new GeminiBrowsingProvider();

    const engine = new GithubAIEngine(provider);

    const results = await engine.processGithubSearchResults(candidates);

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
