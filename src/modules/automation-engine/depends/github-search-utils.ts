import type { Octokit } from "@octokit/rest";
import {
  getFetchedRepoByName,
  findExtensionByRepoFullName,
} from "../saving-engine/repository/saving-repository";
import { isEligibleGithubSearchItem } from "./extension-utils";

export async function isRepoAlreadyProcessed(
  fullName: string,
): Promise<boolean> {
  const [fetched, existingExtension] = await Promise.all([
    getFetchedRepoByName(fullName),
    findExtensionByRepoFullName(fullName),
  ]);

  return Boolean(fetched || existingExtension);
}

export async function paginateGithubSearch<T>(
  octokit: Octokit,
  searchQuery: string,
  perPage: number,
  mapItem: (item: Record<string, unknown>) => Promise<T | null>,
  options: { maxPages?: number; pageSize?: number } = {},
): Promise<T[]> {
  const maxPages = options.maxPages ?? 5;
  const pageSize = Math.min(options.pageSize ?? 100, 100);
  const results: T[] = [];
  let page = 1;

  while (results.length < perPage && page <= maxPages) {
    const { data } = await octokit.rest.search.repos({
      q: searchQuery,
      sort: "stars",
      order: "desc",
      per_page: pageSize,
      page,
    });

    if (data.items.length === 0) break;

    for (const item of data.items) {
      if (results.length >= perPage) break;

      if (!isEligibleGithubSearchItem(item as Record<string, unknown>)) {
        continue;
      }

      const mapped = await mapItem(item as Record<string, unknown>);
      if (mapped) results.push(mapped);
    }

    page++;
    if (data.items.length < pageSize) break;
  }

  return results;
}
