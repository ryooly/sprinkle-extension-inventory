import { Octokit } from "@octokit/rest";
import {
  createFetchedRepo,
  getFetchedRepoByName,
} from "../../saving-engine/repository/saving-repository";
import { AppError } from "@/middlewares/errorHandler";
import {
  GithubAIEngine,
  GeminiBrowsingProvider,
  ExtensionRepo,
} from "../ai-engine/gpt.engine";

export interface SearchOptions {
  query?: string;
  perPage?: number;
  minStars?: number;
  token?: string;
}

interface RepoCandidate {
  link: string;
  fullName: string;
  defaultBranch: string;
}

const MIN_CREATED_YEAR = 2017;

function buildQuery(extraKeyword = "", minStars: number): string {
  const starsFilter = `stars:>=${minStars}`;
  const dateFilter = `created:>=${MIN_CREATED_YEAR}-01-01`;
  const keyword = extraKeyword
    ? `browser extension ${extraKeyword}`
    : "browser extension";

  return `${keyword} ${starsFilter} ${dateFilter} is:public`;
}

async function filterNewRepos(
  items: Array<Record<string, any>>,
  perPage: number,
): Promise<RepoCandidate[]> {
  const candidates: RepoCandidate[] = [];

  for (const item of items) {
    if (candidates.length >= perPage) break;

    if (!item.description || item.description.trim().length < 10) continue;

    const alreadyFetched = await getFetchedRepoByName(item.full_name);
    if (alreadyFetched) continue;

    await createFetchedRepo(item.full_name);

    candidates.push({
      link: item.html_url,
      fullName: item.full_name,
      defaultBranch: item.default_branch ?? "main",
    });
  }

  return candidates;
} // mungkin gw bakal ubah ketentuannya deh karena ini kan by AI 

export async function fetchBrowserExtensions(
  options: SearchOptions = {},
): Promise<ExtensionRepo[]> {
  const { query = "", perPage = 20, minStars = 10, token } = options;

  const octokit = new Octokit({ auth: token });
  const searchQuery = buildQuery(query, minStars);
  const fetchBuffer = perPage * 2;

  try {
    const { data } = await octokit.rest.search.repos({
      q: searchQuery,
      sort: "stars",
      order: "desc",
      per_page: fetchBuffer,
    });

    const candidates = await filterNewRepos(data.items, perPage);
    if (candidates.length === 0) return [];

    const provider = new GeminiBrowsingProvider();
    const engine = new GithubAIEngine(provider);

    const results = await engine.processGithubSearchResults(candidates);

    return results
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions from GitHub`, 500, {
      cause: err,
    });
  }
}

