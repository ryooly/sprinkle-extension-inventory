import { Octokit } from "@octokit/rest";
import {
  createFetchedRepo,
  getFetchedRepoByName,
} from "../saving-engine/repository/saving-repository";
import { AppError } from "@/middlewares/errorHandler";
import {
  GithubAIEngine,
  GeminiBrowsingProvider,
  ExtensionRepo,
  Category,
} from "./github-ai-engine";

/**
 * ============================================================
 *  FETCH BROWSER EXTENSIONS (GitHub -> AI Engine)
 *
 *  Yang DIHAPUS dari versi sebelumnya (karena udah jadi tugas AI engine):
 *  - toExtensionRepo()          -> AI yang nentuin name/publisher/description
 *  - inferCategoriesFromTopics()-> AI yang cocokin category dari konteks
 *  - topicToCategory mapping    -> gak dipakai lagi, AI baca konteks langsung
 *
 *  Yang TETAP manual di sini (karena BUKAN tugas AI, ini logic bisnis kita):
 *  - Filter dedup (skip repo yang udah pernah diproses, cek ke DB sendiri)
 *  - Bikin downloadUrl (link zip archive) -> ini deterministik dari data
 *    Octokit (owner/repo/default_branch), gak perlu ditebak AI sama sekali.
 * ============================================================
 */

export interface SearchOptions {
  query?: string;
  perPage?: number;
  minStars?: number;
  token?: string;
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

// Data minimal yang kita simpen SENDIRI per-repo, buat 2 keperluan
// non-AI: dedup check dan bikin URL zip archive setelah AI selesai.
interface RepoCandidate {
  link: string;
  fullName: string;
  defaultBranch: string;
}

// -----------------------------------------------------------
// Filter yang BUKAN tugas AI: buang repo tanpa deskripsi sama sekali
// (gak ada bahan buat dianalisis) dan repo yang udah pernah diproses.
// ----------------------------------------------------------
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
}

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

    // 1. Filter manual seperlunya (dedup + skip repo tanpa deskripsi)
    const candidates = await filterNewRepos(data.items, perPage);
    if (candidates.length === 0) return [];

    // 2. Sisanya -- name, publisher, description, category,
    //    verificationPercentage, permissions -- SEMUA ditentukan AI.

    const provider = new GeminiBrowsingProvider();
    const engine = new GithubAIEngine(provider);

    /// harusnya di ubah ke processGithub result gitu dan
    const results = await engine.processGithubSearchResults(candidates);

    // 3. Satu hal yang kita override manual: downloadUrl.
    //    AI cuma balikin link repo apa adanya (fallback), padahal kita
    //    butuh link ZIP archive-nya. Ini deterministik, gak perlu AI,
    //    jadi kita hitung sendiri dari data Octokit yang udah kita simpen.
    const branchByLink = new Map(
      candidates.map((c) => [c.link, c.defaultBranch]),
    );

    return results.map((repo) => ({
      ...repo,
      downloadUrl: `${repo.downloadUrl}/archive/refs/heads/${
        branchByLink.get(repo.downloadUrl) ?? "main"
      }.zip`,
    }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions from GitHub`, 500, {
      cause: err,
    });
  }
}
