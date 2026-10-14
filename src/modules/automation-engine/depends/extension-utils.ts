import { categoryEnum, type Category } from "@/models";
import type { Browser } from "@/models";
import type { ExtensionRepo } from "../github-explorer/api-engine";
import axios from "axios";
import { Octokit } from "@octokit/rest";

export const PRIMARY_BROWSERS = [
  "chrome",
  "firefox",
  "edge",
  "opera",
  "safari",
] as const satisfies readonly Browser[];

const CHROMIUM_BROWSERS: Browser[] = ["chrome", "edge", "opera"];

const GENERIC_MANIFEST_PATHS = [
  "manifest.json",
  "src/manifest.json",
  "extension/manifest.json",
  "app/manifest.json",
  "dist/manifest.json",
  "build/manifest.json",
  "public/manifest.json",
];

const BROWSER_MANIFEST_PATHS: { browser: Browser; path: string }[] = [
  { browser: "chrome", path: "chrome/manifest.json" },
  { browser: "firefox", path: "firefox/manifest.json" },
  { browser: "edge", path: "edge/manifest.json" },
  { browser: "opera", path: "opera/manifest.json" },
  { browser: "safari", path: "safari/manifest.json" },
];

async function readManifestFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

    if (!data || Array.isArray(data) || data.type !== "file") return null;

    const content = (data as { content?: string }).content;
    if (typeof content !== "string") return null;

    const decoded = Buffer.from(content, "base64").toString("utf-8");
    const parsed: unknown = JSON.parse(decoded);

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function classifyGenericManifest(manifest: Record<string, unknown>): Browser[] {
  const supported = new Set<Browser>(CHROMIUM_BROWSERS);

  const specific = (manifest.browser_specific_settings ??
    manifest.applications) as Record<string, unknown> | undefined;

  if (specific && (specific.gecko || specific.firefox)) {
    supported.add("firefox");
  }

  if (manifest.manifest_version === 3) {
    supported.add("safari");
  }

  return PRIMARY_BROWSERS.filter((browser) => supported.has(browser));
}

export async function detectBrowserSupport(
  owner: string,
  repo: string,
  token?: string,
): Promise<Browser[]> {
  const trimmedOwner = owner?.trim();
  const trimmedRepo = repo?.trim();

  if (!trimmedOwner || !trimmedRepo) return ["chrome"];

  const octokit = new Octokit({ auth: token ?? process.env.GITHUB_TOKEN });

  for (const path of GENERIC_MANIFEST_PATHS) {
    const manifest = await readManifestFile(
      octokit,
      trimmedOwner,
      trimmedRepo,
      path,
    );

    if (manifest) return classifyGenericManifest(manifest);
  }

  const browserSpecific: Browser[] = [];

  for (const { browser, path } of BROWSER_MANIFEST_PATHS) {
    const manifest = await readManifestFile(
      octokit,
      trimmedOwner,
      trimmedRepo,
      path,
    );

    if (manifest) browserSpecific.push(browser);
  }

  return browserSpecific.length > 0 ? browserSpecific : ["chrome"];
}

export interface LicenseDetails {
  name: string;
  description: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  url: string;
}

const GITHUB_LICENSES_BASE = "https://api.github.com/licenses";

export async function fetchLicenseDetails(
  licenseKey: string,
  token?: string,
): Promise<LicenseDetails | null> {
  const key = licenseKey.trim();
  if (!key) return null;

  const auth = token ?? process.env.GITHUB_TOKEN;

  try {
    const { data } = await axios.get(
      `${GITHUB_LICENSES_BASE}/${encodeURIComponent(key)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        },
        timeout: 8000,
      },
    );

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : [];

    return {
      name: typeof data?.name === "string" ? data.name : key,
      description:
        typeof data?.description === "string" ? data.description : "",
      permissions: toStringArray(data?.permissions),
      conditions: toStringArray(data?.conditions),
      limitations: toStringArray(data?.limitations),
      url:
        typeof data?.html_url === "string"
          ? data.html_url
          : typeof data?.url === "string"
            ? data.url
            : "",
    };
  } catch {
    return null;
  }
}

export const MIN_DESCRIPTION_LENGTH = 10;
export const MIN_CREATED_YEAR = 2017;

const VALID_CATEGORIES = new Set<Category>(categoryEnum.enumValues);

export function buildGithubSearchQuery(
  extraKeyword = "",
  minStars: number,
): string {
  const starsFilter = `stars:>=${minStars}`;
  const dateFilter = `created:>=${MIN_CREATED_YEAR}-01-01`;
  const keyword = extraKeyword
    ? `browser extension ${extraKeyword}`
    : "browser extension";

  return `${keyword} ${starsFilter} ${dateFilter} is:public`;
}

export function resolveDefaultBranch(branch?: string | null): string {
  const trimmed = branch?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "main";
}

export function buildGithubZipUrl(
  htmlUrl: string,
  defaultBranch?: string | null,
): string {
  const base = htmlUrl.replace(/\/$/, "");
  const branch = encodeURIComponent(resolveDefaultBranch(defaultBranch));
  return `${base}/archive/refs/heads/${branch}.zip`;
}

export function isValidGithubZipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "github.com" &&
      /\/archive\/refs\/heads\/[^/]+\.zip$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function parseGithubZipUrl(
  url: string,
): { repoUrl: string; defaultBranch: string } | null {
  const match =
    /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/archive\/refs\/heads\/([^/]+)\.zip$/.exec(
      url.trim(),
    );

  if (!match) return null;

  return {
    repoUrl: match[1],
    defaultBranch: decodeURIComponent(match[2]),
  };
}

export function sanitizeCategories(categories: unknown): Category[] {
  if (!Array.isArray(categories)) return ["other"];

  const valid = categories.filter(
    (value): value is Category =>
      typeof value === "string" && VALID_CATEGORIES.has(value as Category),
  );

  return valid.length > 0 ? [...new Set(valid)] : ["other"];
}

export function validateExtensionRepo(
  repo: ExtensionRepo,
): { valid: true; data: ExtensionRepo } | { valid: false; reason: string } {
  const name = repo.name?.trim();
  const description = repo.description?.trim();
  const publisher = repo.publisher?.trim();
  const downloadUrl = repo.downloadUrl?.trim();

  if (!name) return { valid: false, reason: "missing name" };
  if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
    return { valid: false, reason: "description too short" };
  }
  if (!publisher) return { valid: false, reason: "missing publisher" };
  if (!downloadUrl || !isValidGithubZipUrl(downloadUrl)) {
    return { valid: false, reason: "invalid GitHub archive URL" };
  }

  return {
    valid: true,
    data: {
      ...repo,
      name,
      description,
      publisher,
      downloadUrl,
      category: sanitizeCategories(repo.category),
    },
  };
}

export function isEligibleGithubSearchItem(
  item: Record<string, unknown>,
): boolean {
  const description = item.description;
  return (
    typeof item.full_name === "string" &&
    typeof item.html_url === "string" &&
    typeof description === "string" &&
    description.trim().length >= MIN_DESCRIPTION_LENGTH
  );
}
