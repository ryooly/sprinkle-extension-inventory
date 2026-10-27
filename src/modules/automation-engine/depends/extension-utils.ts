import {
  categoryEnum,
  browserPermissionEnum,
  type Category,
  type Browser,
  type BrowserPermission,
} from "@/models";
import type { ExtensionRepo } from "../github-explorer/api-engine";
import { logger } from "@/logger";
import axios from "axios";
import { unzipSync } from "fflate";
import { Octokit } from "@octokit/rest";
import { checkUrlSafety, type UrlSafetyVerdict } from "../tools/url-safety";
import { z } from "zod";
import {
  browserSchema,
  categorySchema,
  type BrowserInput,
  type CategoryInput,
} from "@/schemas/extension-input";

const VALID_PERMISSIONS = new Set<BrowserPermission>(
  browserPermissionEnum.enumValues,
);

const MANIFEST_PERMISSION_MAP: Record<string, BrowserPermission> = {
  history: "readBrowsingHistory",
  tabs: "readOpenTabs",
  activetab: "accessCurrentWebsite",
  cookies: "readCookies",
  storage: "readWebsiteData",
  webrequest: "accessAllWebsites",
  clipboardread: "clipboardRead",
  clipboardwrite: "clipboardWrite",
  notifications: "showNotifications",
  geolocation: "accessAllWebsites",
  downloads: "manageDownloads",
  bookmarks: "manageBookmarks",
  background: "backgroundExecution",
  unlimitedstorage: "readWebsiteData",
};

function normalizePermissionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function mapManifestPermissions(raw: unknown): BrowserPermission[] {
  if (!Array.isArray(raw)) return [];

  const permissions = new Set<BrowserPermission>();

  for (const entry of raw) {
    if (typeof entry !== "string") continue;

    const normalized = normalizePermissionKey(entry);
    const mapped = MANIFEST_PERMISSION_MAP[normalized];

    if (mapped) {
      permissions.add(mapped);
      continue;
    }

    if (VALID_PERMISSIONS.has(entry as BrowserPermission)) {
      permissions.add(entry as BrowserPermission);
    }
  }

  return [...permissions];
}

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

const README_PATHS = [
  "README.md",
  "README.markdown",
  "README.rst",
  "README.txt",
  "README",
  "readme.md",
  "Readme.md",
];

const MAX_README_CHARS = 100_000;

export function formatReadmeContent(raw: string): string {
  const normalized = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\0/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized.length > MAX_README_CHARS
    ? normalized.slice(0, MAX_README_CHARS).trimEnd()
    : normalized;
}

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

// NOTE: Browser/permission detection now lives on the ExtensionUtils class so a
// single Octokit instance is reused across calls instead of being rebuilt each time.

// Common GitHub language names (lower-cased) grouped by where they are
// typically used. A language is matched case-insensitively against these sets.
export const FRONTEND_LANGUAGES: ReadonlySet<string> = new Set([
  "javascript",
  "typescript",
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "stylus",
  "vue",
  "svelte",
  "coffeescript",
  "jsx",
  "tsx",
]);

export const BACKEND_LANGUAGES: ReadonlySet<string> = new Set([
  "python",
  "java",
  "go",
  "ruby",
  "php",
  "c#",
  "c",
  "c++",
  "rust",
  "scala",
  "kotlin",
  "elixir",
  "erlang",
  "haskell",
  "perl",
  "dart",
  "clojure",
  "crystal",
  "groovy",
  "objectivec",
  "swift",
  "lua",
]);

export function classifyLanguage(name: string): "frontend" | "backend" | null {
  const normalized = name.trim().toLowerCase();

  if (FRONTEND_LANGUAGES.has(normalized)) return "frontend";
  if (BACKEND_LANGUAGES.has(normalized)) return "backend";

  return null;
}

export const MAX_REPO_FILES = 200;

export interface RepoFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding: "base64";
  content: string;
}

export async function fetchRepoFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
  token?: string,
): Promise<RepoFileContent | null> {
  const octokit = new Octokit({ auth: token ?? process.env.GITHUB_TOKEN });
  return readRepoFileContent(octokit, owner, repo, path, ref);
}

// Shared reader used by both the standalone fetchRepoFile and the
// ExtensionUtils class so the file-fetch logic is written only once.
async function readRepoFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<RepoFileContent | null> {
  const trimmedOwner = owner?.trim();
  const trimmedRepo = repo?.trim();
  const trimmedPath = path?.trim();

  if (!trimmedOwner || !trimmedRepo || !trimmedPath) return null;

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: trimmedOwner,
      repo: trimmedRepo,
      path: trimmedPath,
      ref: resolveDefaultBranch(ref),
    });

    if (
      !data ||
      Array.isArray(data) ||
      data.type !== "file" ||
      typeof (data as { content?: unknown }).content !== "string"
    ) {
      return null;
    }

    return {
      name: data.name,
      path: data.path,
      sha: data.sha,
      size: data.size ?? 0,
      encoding: "base64",
      content: (data as { content: string }).content,
    };
  } catch {
    return null;
  }
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

export function toHashtagToken(value: string): string {
  return value
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function processUserHashtags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];

  const tokens = new Set<string>();

  for (const entry of rawTags) {
    if (typeof entry !== "string") continue;

    const token = toHashtagToken(entry);

    if (token.length > 0) tokens.add(token);
  }

  return [...tokens];
}

export interface AutomationHashtagInput {
  categories: readonly string[];
  languages: readonly string[];
}

export function generateAutomationHashtags(
  input: AutomationHashtagInput,
): string[] {
  const derived = [...input.categories, ...input.languages]
    .map(toHashtagToken)
    .filter((token) => token.length > 0);

  return [...new Set(derived)];
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

// Internal: framework route registrations (Express-style app/router.<verb>("/path"))
const API_ENDPOINT_REGEX =
  /\b(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/g;

// External: outbound HTTP calls (axios.<verb>("https://...") or fetch("https://..."))
const EXTERNAL_API_REGEX =
  /\b(axios\.(get|post|put|delete|patch)|fetch)\s*\(\s*['"`](https?:\/\/.*?)['"`]/g;

const SKIP_FILE_PATTERN =
  /(^|\/)node_modules\/|(dist|build|coverage)\/|\.(test|spec|min)\.[cm]?[jt]s$/;

// Skip suspiciously large sources — a single 1 MB+ generated file is not worth scanning
const MAX_SCANNED_FILE_BYTES = 1_000_000;

export type ApiEndpointType = "internal" | "external";

// Google Safe Browsing verdict for the endpoint, minus the redundant `url`
// field (the endpoint already carries its own path)
export type ApiEndpointSecurity = Omit<UrlSafetyVerdict, "url">;

export interface RepoApiEndpoint {
  type: ApiEndpointType;
  file: string;
  method: string;
  path: string;
  security: ApiEndpointSecurity;
}

function toEndpointSecurity(verdict: UrlSafetyVerdict): ApiEndpointSecurity {
  return {
    safe: verdict.safe,
    threats: verdict.threats,
    checkedAt: verdict.checkedAt,
    skippedOnError: verdict.skippedOnError,
  };
}

// Used for internal route paths (e.g. "/users"), which are not full URLs and
// therefore cannot be evaluated by Safe Browsing
function neutralEndpointSecurity(): ApiEndpointSecurity {
  return {
    safe: true,
    threats: [],
    checkedAt: new Date().toISOString(),
    skippedOnError: true,
  };
}

export async function findApi(
  owner: string,
  repo: string,
  ref?: string | null,
  token?: string,
): Promise<RepoApiEndpoint[]> {
  const trimmedOwner = owner?.trim();
  const trimmedRepo = repo?.trim();

  if (!trimmedOwner || !trimmedRepo) return [];

  const auth = token ?? process.env.GITHUB_TOKEN;

  try {
    const { data } = await axios.get<ArrayBuffer>(
      `https://api.github.com/repos/${encodeURIComponent(trimmedOwner)}/${encodeURIComponent(trimmedRepo)}/zipball/${encodeURIComponent(resolveDefaultBranch(ref))}`,
      {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        },
      },
    );

    const buffer = new Uint8Array(data);

    const files = unzipSync(buffer, {
      filter: (file) =>
        !file.name.endsWith("/") &&
        /\.[cm]?[jt]s$/.test(file.name) &&
        !SKIP_FILE_PATTERN.test(file.name) &&
        file.originalSize <= MAX_SCANNED_FILE_BYTES,
    });

    const internalRegex = new RegExp(API_ENDPOINT_REGEX.source, "g");
    const externalRegex = new RegExp(EXTERNAL_API_REGEX.source, "g");

    const uniqueEndpoints = new Map<string, RepoApiEndpoint>();

    for (const [path, data] of Object.entries(files)) {
      if (!/\.[cm]?[jt]s$/.test(path) || SKIP_FILE_PATTERN.test(path)) {
        continue;
      }

      const content = new TextDecoder().decode(data);

      let match: RegExpExecArray | null;

      while ((match = internalRegex.exec(content)) !== null) {
        const method = match[2].toUpperCase();
        const key = `internal|${method}|${match[3]}`;

        if (!uniqueEndpoints.has(key)) {
          uniqueEndpoints.set(key, {
            type: "internal",
            file: path,
            method,
            path: match[3],
            security: neutralEndpointSecurity(),
          });
        }
      }

      while ((match = externalRegex.exec(content)) !== null) {
        const method = (match[2] ?? "get").toUpperCase();
        const url = match[3];
        const key = `external|${method}|${url}`;

        if (uniqueEndpoints.has(key)) continue;

        const verdict = await checkUrlSafety(url);

        uniqueEndpoints.set(key, {
          type: "external",
          file: path,
          method,
          path: url,
          security: toEndpointSecurity(verdict),
        });
      }
    }

    const foundEndpoints = [...uniqueEndpoints.values()];

    logger.info(
      { owner: trimmedOwner, repo: trimmedRepo, count: foundEndpoints.length },
      "findApi scanned repo endpoints",
    );

    return foundEndpoints;
  } catch (error) {
    logger.warn(
      { owner: trimmedOwner, repo: trimmedRepo, error },
      "findApi failed to scan repo",
    );
    return [];
  }
}

// ==========================================
// CATATAN ARSITEKTUR: ENGINE SCANNER API REPO
// ==========================================

// 1. MASALAH UTAMA & SOLUSI
// - Masalah: Narik file repo satu-satu pake Octokit bikin lambat, boros network, dan rawan kena Rate Limit GitHub.
// - Solusi: Pakai "Zipball API" (download seluruh repo jadi 1 file ZIP dalam 1x request HTTP).

// 2. KENAPA CARA INI ENTENG & AMAN BUAT SERVER?
// - In-Memory Processing: File ZIP langsung dibaca di RAM (Buffer), TIDAK disimpan permanen ke harddisk server (0% sampah disk).
// - RAM Kecil & Aman: Karena ukuran repo extension kecil (1-5 MB), RAM cuma dipakai sebentar lalu langsung dibersihkan oleh Garbage Collection.
// - CPU Santai: Proses dilakukan bergantian (Sequential/Looping satu-satu), tidak mendadak menembak 20 repo bersamaan agar CPU tidak spike.
// - Efisiensi Waktu: Proses 20 repo extension cuma butuh waktu belasan detik saja, bisa dijadwalkan via Cron Job (misal tiap jam 2 pagi).

// 3. TOOLS / LIBRARY YANG DIBUTUHKAN
// - npm install @octokit/rest adm-zip

// 4. KERANGKA ALUR KERJA ENGINE
// - Step A: Ambil list repo target extension.
// - Step B: Download zipball repo via Octokit (downloadZipballArchive).
// - Step C: Ekstrak zip secara instan di memori pakai 'adm-zip'.
// - Step D: Filter file (hanya ambil file kode .js/.ts, abaikan node_modules).
// - Step E: Scan isi teks file menggunakan Regex untuk menangkap method (GET/POST) dan path.
// - Step F: Kumpulkan hasil akhir ke dalam format JSON object terstruktur per repo.

export type RepoGrade = "S" | "A" | "B" | "C" | "D" | "E";

export interface RepoRatingInput {
  stargazers_count: number;
  forks_count: number;
  pushed_at: Date | string;
  open_issues_count: number;
  closed_issues_count: number;
  security_alerts_count?: number;
}

export interface RepoRatingBreakdown {
  stars: number;
  forks: number;
  lastUpdate: number;
  closedIssueRatio: number;
  securityAlerts: number;
}

export interface RepoRating {
  totalScore: number;
  grade: RepoGrade;
  breakdown: RepoRatingBreakdown;
}

const DAY_MS = 86_400_000;

function scoreStars(stars: number): number {
  if (stars >= 1000) return 25;
  if (stars >= 250) return 20;
  if (stars >= 50) return 15;
  if (stars >= 10) return 10;
  return 5;
}

function scoreForks(forks: number): number {
  if (forks >= 300) return 20;
  if (forks >= 100) return 16;
  if (forks >= 20) return 12;
  if (forks >= 5) return 8;
  return 4;
}

function daysSince(date: Date | string): number {
  const parsed = date instanceof Date ? date : new Date(date);
  const time = parsed.getTime();

  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.floor((Date.now() - time) / DAY_MS));
}

function scoreLastUpdate(days: number): number {
  if (days <= 30) return 20;
  if (days <= 90) return 15;
  if (days <= 180) return 10;
  if (days <= 365) return 5;
  return 0;
}

function scoreClosedIssueRatio(open: number, closed: number): number {
  const total = open + closed;
  if (total <= 0) return 10;

  const ratio = (closed / total) * 100;

  if (ratio >= 80) return 20;
  if (ratio >= 60) return 15;
  if (ratio >= 40) return 10;
  if (ratio >= 20) return 5;
  return 0;
}

function scoreSecurityAlerts(alerts: number): number {
  if (alerts <= 0) return 15;
  if (alerts <= 2) return 10;
  return 0;
}

function toRepoGrade(totalScore: number): RepoGrade {
  if (totalScore >= 85) return "S";
  if (totalScore >= 70) return "A";
  if (totalScore >= 55) return "B";
  if (totalScore >= 40) return "C";
  if (totalScore >= 25) return "D";
  return "E";
}

export function rateRepository(input: RepoRatingInput): RepoRating {
  const breakdown: RepoRatingBreakdown = {
    stars: scoreStars(input.stargazers_count),
    forks: scoreForks(input.forks_count),
    lastUpdate: scoreLastUpdate(daysSince(input.pushed_at)),
    closedIssueRatio: scoreClosedIssueRatio(
      input.open_issues_count,
      input.closed_issues_count,
    ),
    securityAlerts: scoreSecurityAlerts(input.security_alerts_count ?? 0),
  };

  const totalScore =
    breakdown.stars +
    breakdown.forks +
    breakdown.lastUpdate +
    breakdown.closedIssueRatio +
    breakdown.securityAlerts;

  return { totalScore, grade: toRepoGrade(totalScore), breakdown };
}

export type SecurityRisk =
  | "flagged-endpoint"
  | "unverified-endpoint"
  | "insecure-endpoint"
  | "sensitive-permission";

export interface SecurityScoreEndpoint {
  type: ApiEndpointType;
  path: string;
  security: ApiEndpointSecurity;
}

export interface SecurityScoreInput {
  endpoints?: Array<SecurityScoreEndpoint | string>;
  permissions?: BrowserPermission[];
}

export interface SecurityScoreBreakdown {
  endpointThreats: number;
  verificationConfidence: number;
  transportHygiene: number;
  permissionExposure: number;
}

export interface ExtensionSecurityScore {
  score: number;
  breakdown: SecurityScoreBreakdown;
  risks: SecurityRisk[];
}

const MAX_SECURITY_SCORE = 100;
const FLAGGED_ENDPOINT_SCORE_CAP = 25;

const PERMISSION_SENSITIVITY: Record<BrowserPermission, number> = {
  accessAllWebsites: 8,
  readCookies: 7,
  clipboardRead: 6,
  readBrowsingHistory: 6,
  readOpenTabs: 4,
  readWebsiteData: 4,
  manageDownloads: 3,
  accessCurrentWebsite: 2,
  backgroundExecution: 2,
  clipboardWrite: 2,
  manageBookmarks: 2,
  showNotifications: 1,
};

const SUSPICIOUS_HOST_SUFFIXES = [
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "rb.gy",
  "rebrand.ly",
  "t.co",
  "tinyurl.com",
];

const IPV4_HOST_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;
const PUNYCODE_HOST_REGEX = /(^|\.)xn--/i;
const STANDARD_PORTS = new Set(["80", "443"]);
const LOCAL_ENDPOINT_REGEX = /^(internal|external):([A-Z]+)\s+(.+)$/;

function isSuspiciousEndpoint(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:") return true;
    if (IPV4_HOST_REGEX.test(host)) return true;
    if (PUNYCODE_HOST_REGEX.test(host)) return true;
    if (parsed.port.length > 0 && !STANDARD_PORTS.has(parsed.port)) return true;
    if (host.split(".").length > 4) return true;

    return SUSPICIOUS_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return true;
  }
}

function toScoredEndpoint(
  entry: SecurityScoreEndpoint | string,
): SecurityScoreEndpoint | null {
  if (typeof entry !== "string") return entry;

  const match = LOCAL_ENDPOINT_REGEX.exec(entry.trim());
  if (!match) return null;

  const type = match[1] as ApiEndpointType;

  return {
    type,
    path: match[3].trim(),
    security: {
      safe: true,
      threats: [],
      checkedAt: new Date().toISOString(),
      skippedOnError: type === "external",
    },
  };
}

function scoreEndpointThreats(flagged: number): number {
  if (flagged === 0) return 40;
  if (flagged === 1) return 10;
  return 0;
}

function scoreVerificationConfidence(
  unverified: number,
  total: number,
): number {
  if (total === 0 || unverified === 0) return 20;

  const ratio = unverified / total;

  if (ratio <= 0.25) return 15;
  if (ratio <= 0.5) return 10;
  if (ratio <= 0.75) return 5;
  return 0;
}

function scoreTransportHygiene(suspicious: number, total: number): number {
  if (total === 0 || suspicious === 0) return 15;

  const ratio = suspicious / total;

  if (ratio <= 0.25) return 11;
  if (ratio <= 0.5) return 7;
  if (ratio <= 0.75) return 3;
  return 0;
}

function permissionRiskWeight(permissions: BrowserPermission[]): number {
  return permissions.reduce(
    (total, permission) => total + PERMISSION_SENSITIVITY[permission],
    0,
  );
}

function scorePermissionExposure(weight: number): number {
  if (weight === 0) return 25;
  if (weight <= 4) return 21;
  if (weight <= 9) return 16;
  if (weight <= 16) return 10;
  if (weight <= 24) return 5;
  return 0;
}

export function computeSecurityScore(
  input: SecurityScoreInput,
): ExtensionSecurityScore {
  const permissions = [...new Set(input.permissions ?? [])];

  const externalEndpoints = (input.endpoints ?? [])
    .map(toScoredEndpoint)
    .filter((endpoint): endpoint is SecurityScoreEndpoint => endpoint !== null)
    .filter((endpoint) => endpoint.type === "external");

  const total = externalEndpoints.length;
  const flagged = externalEndpoints.filter(
    (endpoint) => !endpoint.security.safe,
  ).length;
  const unverified = externalEndpoints.filter(
    (endpoint) => endpoint.security.skippedOnError,
  ).length;
  const suspicious = externalEndpoints.filter((endpoint) =>
    isSuspiciousEndpoint(endpoint.path),
  ).length;
  const weight = permissionRiskWeight(permissions);

  const breakdown: SecurityScoreBreakdown = {
    endpointThreats: scoreEndpointThreats(flagged),
    verificationConfidence: scoreVerificationConfidence(unverified, total),
    transportHygiene: scoreTransportHygiene(suspicious, total),
    permissionExposure: scorePermissionExposure(weight),
  };

  const risks: SecurityRisk[] = [];

  if (flagged > 0) risks.push("flagged-endpoint");
  if (unverified > 0) risks.push("unverified-endpoint");
  if (suspicious > 0) risks.push("insecure-endpoint");
  if (weight > 4) risks.push("sensitive-permission");

  const rawScore =
    breakdown.endpointThreats +
    breakdown.verificationConfidence +
    breakdown.transportHygiene +
    breakdown.permissionExposure;

  const cappedScore =
    flagged > 0 ? Math.min(rawScore, FLAGGED_ENDPOINT_SCORE_CAP) : rawScore;

  const score = Math.max(0, Math.min(MAX_SECURITY_SCORE, cappedScore));

  return { score, breakdown, risks };
}

async function countClosedIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<number> {
  try {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} type:issue state:closed`,
      per_page: 1,
    });

    return typeof data?.total_count === "number" ? data.total_count : 0;
  } catch {
    return 0;
  }
}

// Gathers every rating input from the GitHub REST API. repos.get yields stars,
// forks, pushed_at and open_issues; the search API yields the closed-issue
// count. GitHub does not expose other repos' security alerts to the automation
// token, so security_alerts_count stays at the spec default of 0 here.
// (The gathering logic now lives on ExtensionUtils.getRepositoryMetrics.)

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

// Single entry point for every GitHub-backed extension scan. Constructing it
// once reuses one Octokit client across all calls instead of rebuilding a
// client per function, and lets callers (e.g. save-service) drive everything
// from one object.
export class ExtensionUtils {
  private readonly octokit: Octokit;
  private readonly token: string | undefined;

  constructor(token?: string) {
    this.token = token ?? process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({ auth: this.token });
  }

  async detectBrowserSupport(owner: string, repo: string): Promise<Browser[]> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return ["chrome"];

    for (const path of GENERIC_MANIFEST_PATHS) {
      const manifest = await readManifestFile(
        this.octokit,
        trimmedOwner,
        trimmedRepo,
        path,
      );

      if (manifest) return classifyGenericManifest(manifest);
    }

    const browserSpecific: Browser[] = [];

    for (const { browser, path } of BROWSER_MANIFEST_PATHS) {
      const manifest = await readManifestFile(
        this.octokit,
        trimmedOwner,
        trimmedRepo,
        path,
      );

      if (manifest) browserSpecific.push(browser);
    }

    return browserSpecific.length > 0 ? browserSpecific : ["chrome"];
  }

  async detectManifestPermissions(
    owner: string,
    repo: string,
  ): Promise<BrowserPermission[]> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return [];

    for (const path of GENERIC_MANIFEST_PATHS) {
      const manifest = await readManifestFile(
        this.octokit,
        trimmedOwner,
        trimmedRepo,
        path,
      );

      if (manifest) return mapManifestPermissions(manifest.permissions);
    }

    for (const { path } of BROWSER_MANIFEST_PATHS) {
      const manifest = await readManifestFile(
        this.octokit,
        trimmedOwner,
        trimmedRepo,
        path,
      );

      if (manifest) return mapManifestPermissions(manifest.permissions);
    }

    return [];
  }

  async detectLanguages(
    owner: string,
    repo: string,
  ): Promise<[string[], string[]]> {
    const frontend: string[] = [];
    const backend: string[] = [];

    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return [frontend, backend];

    try {
      const { data } = await this.octokit.rest.repos.listLanguages({
        owner: trimmedOwner,
        repo: trimmedRepo,
      });

      const entries = Object.entries(data)
        .filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        )
        .sort((a, b) => b[1] - a[1]);

      for (const [name] of entries) {
        const category = classifyLanguage(name);

        if (category === "frontend") frontend.push(name);
        else if (category === "backend") backend.push(name);
      }

      return [frontend, backend];
    } catch {
      return [frontend, backend];
    }
  }

  async getLastCommitDate(owner: string, repo: string): Promise<Date | null> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return null;

    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: trimmedOwner,
        repo: trimmedRepo,
        per_page: 1,
      });

      const latest = data[0];
      const date =
        latest?.commit?.committer?.date ?? latest?.commit?.author?.date;

      return date ? new Date(date) : null;
    } catch {
      return null;
    }
  }

  async getRepoFiles(owner: string, repo: string): Promise<string[]> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return [];

    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner: trimmedOwner,
        repo: trimmedRepo,
        tree_sha: "HEAD",
        recursive: "1",
      });

      if (!Array.isArray(data?.tree)) return [];

      const files = data.tree
        .filter(
          (entry) => entry?.type === "blob" && typeof entry.path === "string",
        )
        .map((entry) => entry.path);

      return files.slice(0, MAX_REPO_FILES);
    } catch {
      return [];
    }
  }

  async getReadmeContent(owner: string, repo: string): Promise<string | null> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    if (!trimmedOwner || !trimmedRepo) return null;

    try {
      const { data } = await this.octokit.rest.repos.getReadme({
        owner: trimmedOwner,
        repo: trimmedRepo,
      });

      if (!data || Array.isArray(data) || data.type !== "file") return null;

      const content = (data as { content?: string }).content;
      if (typeof content !== "string") return null;

      const decoded = Buffer.from(content, "base64").toString("utf-8");
      const formatted = formatReadmeContent(decoded);

      return formatted.length > 0 ? formatted : null;
    } catch {
      return null;
    }
  }

  // Gathers every rating input from the GitHub REST API. repos.get yields stars,
  // forks, pushed_at and open_issues; the search API yields the closed-issue
  // count. GitHub does not expose other repos' security alerts to the automation
  // token, so security_alerts_count stays at the spec default of 0 here.
  async getRepositoryMetrics(
    owner: string,
    repo: string,
  ): Promise<RepoRatingInput> {
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();

    const empty: RepoRatingInput = {
      stargazers_count: 0,
      forks_count: 0,
      pushed_at: new Date(0),
      open_issues_count: 0,
      closed_issues_count: 0,
      security_alerts_count: 0,
    };

    if (!trimmedOwner || !trimmedRepo) return empty;

    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: trimmedOwner,
        repo: trimmedRepo,
      });

      const closedIssues = await countClosedIssues(
        this.octokit,
        trimmedOwner,
        trimmedRepo,
      );

      return {
        stargazers_count: data.stargazers_count ?? 0,
        forks_count: data.forks_count ?? 0,
        pushed_at: data.pushed_at ?? new Date(),
        open_issues_count: data.open_issues_count ?? 0,
        closed_issues_count: closedIssues,
        security_alerts_count: 0,
      };
    } catch {
      return empty;
    }
  }

  findApi(
    owner: string,
    repo: string,
    ref?: string | null,
  ): Promise<RepoApiEndpoint[]> {
    return findApi(owner, repo, ref, this.token);
  }

  fetchLicenseDetails(licenseKey: string): Promise<LicenseDetails | null> {
    return fetchLicenseDetails(licenseKey, this.token);
  }

  validateRepo(
    repo: ExtensionRepo,
  ): { valid: true; data: ExtensionRepo } | { valid: false; reason: string } {
    return validateExtensionRepo(repo);
  }

  parseZipUrl(url: string): { repoUrl: string; defaultBranch: string } | null {
    return parseGithubZipUrl(url);
  }

  rateRepository(input: RepoRatingInput): RepoRating {
    return rateRepository(input);
  }

  computeSecurityScore(input: SecurityScoreInput): ExtensionSecurityScore {
    return computeSecurityScore(input);
  }
}

export const extensionUploadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name must not be empty")
    .max(120, "name must be 120 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(
      MIN_DESCRIPTION_LENGTH,
      `description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
    )
    .max(2000, "description must be 2000 characters or fewer"),
  developer: z
    .string()
    .trim()
    .min(1, "developer must not be empty")
    .max(100, "developer must be 100 characters or fewer"),
  categories: z
    .array(categorySchema)
    .min(1, "at least one category is required")
    .max(5, "at most five categories are allowed"),
  supportedBrowsers: z
    .array(browserSchema)
    .min(1, "at least one supported browser is required")
    .default(["chrome"]),
  hashtags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});

export type ExtensionUploadData = {
  name: string;
  description: string;
  developer: string;
  categories: CategoryInput[];
  supportedBrowsers: BrowserInput[];
  hashtags: string[];
};

const PACKAGE_BLOCKED_PATH_REGEX =
  /(^|\/)(node_modules|\.git|\.svn|\.hg|\.vscode|\.github|\.cache|__pycache__|coverage)(\/|$)/i;

const PACKAGE_BINARY_REGEX =
  /\.(exe|dll|so|dylib|msi|dmg|pkg|deb|rpm|class|jar|war|pyc|o|a|lib|bin|mp4|mkv|avi|mp3|wav|zip|tar|gz|7z|rar)$/i;

export const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;
export const MAX_PACKAGE_ENTRIES = 1_000;
export const MAX_PACKAGE_ENTRY_BYTES = 20 * 1024 * 1024;
export const MAX_PACKAGE_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

const MAX_PACKAGE_COMPRESSION_RATIO = 100;
const ZIP_BOMB_MIN_BYTES = 1_000_000;

export interface ExtensionPackageInfo {
  fileName: string;
  sizeBytes: number;
  entryCount: number;
  uncompressedBytes: number;
  hasManifest: boolean;
}

export interface ExtensionPackageScan {
  valid: boolean;
  issues: string[];
  info: ExtensionPackageInfo;
}

function isManifestPath(path: string): boolean {
  return /(^|\/)manifest\.json$/i.test(path);
}

export function inspectExtensionPackage(
  bytes: Uint8Array,
  fileName = "package.zip",
): ExtensionPackageScan {
  const info: ExtensionPackageInfo = {
    fileName,
    sizeBytes: bytes.byteLength,
    entryCount: 0,
    uncompressedBytes: 0,
    hasManifest: false,
  };

  const issues: string[] = [];

  if (info.sizeBytes === 0) {
    return { valid: false, issues: ["uploaded file is empty"], info };
  }

  if (info.sizeBytes > MAX_PACKAGE_BYTES) {
    issues.push(
      `package too large (${info.sizeBytes} bytes, max ${MAX_PACKAGE_BYTES})`,
    );
  }

  const entries: { name: string; size: number; originalSize: number }[] = [];

  try {
    unzipSync(bytes, {
      filter: (file) => {
        entries.push({
          name: file.name,
          size: file.size,
          originalSize: file.originalSize,
        });
        return false;
      },
    });
  } catch {
    issues.push("uploaded file is not a valid .zip archive");
    return { valid: false, issues, info };
  }

  const files = entries.filter((entry) => !entry.name.endsWith("/"));

  info.entryCount = files.length;
  info.uncompressedBytes = files.reduce(
    (total, entry) => total + entry.originalSize,
    0,
  );

  if (files.length === 0) {
    issues.push("package contains no files");
  }

  if (files.length > MAX_PACKAGE_ENTRIES) {
    issues.push(
      `package contains too many files (${files.length}, max ${MAX_PACKAGE_ENTRIES})`,
    );
  }

  if (info.uncompressedBytes > MAX_PACKAGE_UNCOMPRESSED_BYTES) {
    issues.push(
      `package unpacks too large (${info.uncompressedBytes} bytes, max ${MAX_PACKAGE_UNCOMPRESSED_BYTES})`,
    );
  }

  for (const entry of files) {
    if (isManifestPath(entry.name)) info.hasManifest = true;

    if (entry.name.includes("..") || entry.name.startsWith("/")) {
      issues.push(`"${entry.name}" has an unsafe path`);
      continue;
    }

    const blocked = PACKAGE_BLOCKED_PATH_REGEX.exec(entry.name);

    if (blocked) {
      issues.push(
        `"${entry.name}" belongs to excluded build/dependency folder "${blocked[2]}"`,
      );
      continue;
    }

    if (PACKAGE_BINARY_REGEX.test(entry.name)) {
      issues.push(`"${entry.name}" is a binary or archive payload`);
      continue;
    }

    if (entry.originalSize > MAX_PACKAGE_ENTRY_BYTES) {
      issues.push(
        `"${entry.name}" is too large (${entry.originalSize} bytes, max ${MAX_PACKAGE_ENTRY_BYTES})`,
      );
      continue;
    }

    if (
      entry.originalSize > ZIP_BOMB_MIN_BYTES &&
      entry.size > 0 &&
      entry.originalSize / entry.size > MAX_PACKAGE_COMPRESSION_RATIO
    ) {
      issues.push(`"${entry.name}" looks like a zip bomb`);
    }
  }

  if (!info.hasManifest) {
    issues.push("package is missing manifest.json");
  }

  const unique = [...new Set(issues)];

  return { valid: unique.length === 0, issues: unique, info };
}

export type ExtensionUploadResult =
  | {
      valid: true;
      data: ExtensionUploadData;
      packageInfo: ExtensionPackageInfo;
    }
  | { valid: false; errors: string[] };

export async function validateExtensionUpload(
  input: unknown,
): Promise<ExtensionUploadResult> {
  const errors: string[] = [];

  const parsed = extensionUploadSchema.safeParse(
    (input as Record<string, unknown> | null) ?? {},
  );

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "payload";
      errors.push(`${field}: ${issue.message}`);
    }
  }

  const file = (input as { file?: unknown } | null)?.file;
  let scan: ExtensionPackageScan | null = null;

  if (!(file instanceof File)) {
    errors.push("file: extension package must be an uploaded file");
  } else if (!file.name.toLowerCase().endsWith(".zip")) {
    errors.push("file: extension package must be a .zip file");
  } else {
    try {
      scan = inspectExtensionPackage(
        new Uint8Array(await file.arrayBuffer()),
        file.name,
      );
    } catch {
      errors.push("file: extension package could not be read");
    }

    if (scan) {
      for (const issue of scan.issues) errors.push(`file: ${issue}`);
    }
  }

  if (errors.length > 0 || !parsed.success || !scan) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      developer: parsed.data.developer,
      categories: parsed.data.categories as CategoryInput[],
      supportedBrowsers: parsed.data.supportedBrowsers as BrowserInput[],
      hashtags: parsed.data.hashtags,
    },
    packageInfo: scan.info,
  };
}

export interface LocalPackageResult {
  supportedBrowsers: Browser[];
  permissions: BrowserPermission[];
  frontendLanguages: string[];
  backendLanguages: string[];
  repoFiles: string[];
  apiEndpoints: string[];
  readme: string | null;
  manifest: Record<string, unknown> | null;
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".js": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".c": "C",
  ".cpp": "C++",
  ".rs": "Rust",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".lua": "Lua",
};

function resolveInZip(
  entries: Record<string, Uint8Array>,
  relativePath: string,
): Uint8Array | undefined {
  if (entries[relativePath]) return entries[relativePath];

  const suffix = "/" + relativePath;

  for (const key of Object.keys(entries)) {
    if (!key.endsWith(suffix)) continue;
    const prefix = key.slice(0, key.length - suffix.length);
    if (!prefix.includes("/")) return entries[key];
  }

  return undefined;
}

function scanLocalApiEndpoints(entries: Record<string, Uint8Array>): string[] {
  const found = new Set<string>();
  const internalRe = new RegExp(API_ENDPOINT_REGEX.source, "g");
  const externalRe = new RegExp(EXTERNAL_API_REGEX.source, "g");

  for (const [path, data] of Object.entries(entries)) {
    if (!/\.[cm]?[jt]s$/.test(path) || SKIP_FILE_PATTERN.test(path)) continue;
    if (data.length > MAX_SCANNED_FILE_BYTES) continue;

    const content = new TextDecoder().decode(data);
    let match: RegExpExecArray | null;

    while ((match = internalRe.exec(content)) !== null) {
      found.add(`internal:${match[2].toUpperCase()} ${match[3]}`);
    }
    while ((match = externalRe.exec(content)) !== null) {
      found.add(`external:${(match[2] ?? "get").toUpperCase()} ${match[3]}`);
    }
  }

  return [...found];
}

function readReadmeFromEntries(
  entries: Record<string, Uint8Array>,
): string | null {
  for (const rp of README_PATHS) {
    const data = resolveInZip(entries, rp);
    if (!data) continue;
    const formatted = formatReadmeContent(new TextDecoder().decode(data));
    if (formatted.length > 0) return formatted;
  }

  return null;
}

export function processLocalPackage(bytes: Uint8Array): LocalPackageResult {
  const entries = unzipSync(bytes, {
    filter: (file) =>
      !file.name.endsWith("/") &&
      !PACKAGE_BLOCKED_PATH_REGEX.test(file.name) &&
      !PACKAGE_BINARY_REGEX.test(file.name) &&
      !file.name.includes("..") &&
      !file.name.startsWith("/"),
  });

  const paths = Object.keys(entries);
  const repoFiles = paths.slice(0, MAX_REPO_FILES);

  let manifest: Record<string, unknown> | null = null;

  for (const mp of GENERIC_MANIFEST_PATHS) {
    const data = resolveInZip(entries, mp);
    if (!data) continue;
    try {
      const parsed = JSON.parse(new TextDecoder().decode(data));
      if (parsed && typeof parsed === "object") {
        manifest = parsed as Record<string, unknown>;
        break;
      }
    } catch {
      /* skip malformed */
    }
  }

  const supportedBrowsers: Browser[] = manifest
    ? classifyGenericManifest(manifest)
    : ["chrome"];

  const permissions: BrowserPermission[] = manifest
    ? mapManifestPermissions(manifest.permissions)
    : [];

  const langSet = new Set<string>();

  for (const path of paths) {
    const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
    const lang = EXT_TO_LANGUAGE[ext];
    if (lang) langSet.add(lang);
  }

  const frontendLanguages: string[] = [];
  const backendLanguages: string[] = [];

  for (const lang of langSet) {
    const kind = classifyLanguage(lang);
    if (kind === "frontend") frontendLanguages.push(lang);
    else if (kind === "backend") backendLanguages.push(lang);
  }

  const apiEndpoints = scanLocalApiEndpoints(entries);

  const readme = readReadmeFromEntries(entries);

  return {
    supportedBrowsers,
    permissions,
    frontendLanguages,
    backendLanguages,
    repoFiles,
    apiEndpoints,
    readme,
    manifest,
  };
}
