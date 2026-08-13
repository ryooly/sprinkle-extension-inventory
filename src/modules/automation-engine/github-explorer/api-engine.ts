import { Octokit } from "@octokit/rest";
import {
  createFetchedRepo,
  getFetchedRepoByName,
} from "../saving-engine/repository/saving-repository";
import { Category, VerificationStatus, BrowserPermission, ExtensionStatus } from "../db/schema";
import { AppError } from "@/middlewares/errorHandler";
import { topicToCategory } from "../depends/topics-libary";
import { insertExtensionsFromGithub } from "../saving-engine/saving-engine/save-service"

export interface ExtensionRepo {
  name: string;
  publisher: string;
  description: string;
  downloadUrl: string;
  category: Category[];
  extensionStatus?: ExtensionStatus;
  verified?: VerificationStatus;
  verificationPercentage?: number;
  permissions?: BrowserPermission[];
} // ganti aja pake extension type

export interface SearchOptions {
  query?: string;
  perPage?: number;
  minStars?: number;
  token?: string;
}

interface InsertResult {
  success: boolean;
  data: {
    inserted: number;
    failed: number;
  };
}

interface ServiceResult<TData = unknown> {
  success: boolean;
  data: {
    insertResult: {
      inserted: number;
      failed: number;
    };
    data: TData;
  };
}

export interface ExtensionImportResult {
  insertResult: InsertResult;
  data: ExtensionRepo[];
}

const MIN_CREATED_YEAR = 2017;

function inferCategoriesFromTopics(topics: string[]): Category[] {
  const categories = new Set<Category>();

  for (const topic of topics) {
    const category = topicToCategory[topic];
    if (category) categories.add(category);
  }

  if (categories.size === 0) {
    (["other", "general", "misc"] as Category[]).forEach((c) =>
      categories.add(c),
    );
  }

  return Array.from(categories);
}

function buildQuery(extraKeyword = "", minStars: number): string {
  const starsFilter = `stars:>=${minStars}`;
  const dateFilter = `created:>=${MIN_CREATED_YEAR}-01-01`;
  const keyword = extraKeyword
    ? `browser extension ${extraKeyword}`
    : "browser extension";

  return `${keyword} ${starsFilter} ${dateFilter} is:public`;
}

async function toExtensionRepo(
  item: Record<string, any>,
): Promise<ExtensionRepo | null> {
  if (!item.description || item.description.trim().length < 10) return null;

  const alreadyFetched = await getFetchedRepoByName(item.full_name);
  if (alreadyFetched) return null;

  await createFetchedRepo(item.full_name);

  const category = inferCategoriesFromTopics(item.topics ?? []);

  return {
    name: item.full_name,
    publisher: item.owner?.login ?? "unknown",
    description: item.description.trim(),
    downloadUrl: `${item.html_url}/archive/refs/heads/${
      item.default_branch ?? "main"
    }.zip`,
    category,
  };
}

export async function fetchBrowserExtensions(
  options: SearchOptions = {},
): Promise<ServiceResult> {
  const { query = "", perPage = 5, minStars = 10, token } = options;

  const octokit = new Octokit({ auth: token });

  const searchQuery = buildQuery(query, minStars);

  const ftechBuffer = perPage * 2;

  try {
    const { data } = await octokit.rest.search.repos({
      q: searchQuery,
      sort: "stars",
      order: "desc",
      per_page: ftechBuffer,
    });

    const results: ExtensionRepo[] = [];

    for (const item of data.items) {
      if (results.length >= perPage) break;

      const repo = await toExtensionRepo(item as Record<string, unknown>);
      if (repo) results.push(repo);
    }

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
    throw new AppError(`Failed to fetch extensions from GitHub`, 500, { cause: err });
  }
}

/// (BAGIAN UNTUK MEMASTIKAN REPO YANG PERNAH DI AMBIL DI AMBIL KEMBALI) KEMUDIAN UNTUK MENGKATEGORIKAN CATEGORYNYA, KEMUDIAN UNTUK SEBAIKNYA MEMASTIKAN KALO REPO YANG MASUK ITU 5

// OKE JADI YANG BAKAL GW LAKUIN ADLAAH MENAMBAHKAN REPO YANG PERNAH MASUK KE DATABASE TERUS AKSES UNTUK CHEKING MASUKIN KE DATABASE BARENG WAKTU
