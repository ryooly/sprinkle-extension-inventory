import type {
  BrowserPermission,
  Category,
  VerificationStatus,
} from "../db/schema";
import { browserPermissionEnum } from "../db/schema";
import type { ExtensionRepo } from "../github-explorer/api-engine";
import {
  buildGithubZipUrl,
  sanitizeCategories,
} from "./extension-utils";

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
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

export function mapAiPermissions(raw: unknown): BrowserPermission[] {
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

export function mapAiVerified(
  raw: unknown,
  verificationPercentage?: number,
): VerificationStatus {
  if (raw === "verified" || raw === "not_verified") {
    return raw;
  }

  if (raw === "unverified" || raw === "flagged" || raw === "pending") {
    return "not_verified";
  }

  if (typeof verificationPercentage === "number") {
    return verificationPercentage >= 80 ? "verified" : "not_verified";
  }

  return "not_verified";
}

export interface RepoCandidateContext {
  link: string;
  fullName: string;
  defaultBranch: string;
}

export function mapAiResponseToExtensionRepo(
  raw: string,
  candidate: RepoCandidateContext,
): ExtensionRepo | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    if (
      typeof parsed.name !== "string" ||
      typeof parsed.description !== "string" ||
      !Array.isArray(parsed.category)
    ) {
      return null;
    }

    const description = parsed.description.trim();
    if (description.length < 10) return null;

    const verificationPercentage =
      typeof parsed.verificationPercentage === "number"
        ? Math.min(100, Math.max(0, parsed.verificationPercentage))
        : undefined;

    return {
      name: String(parsed.name).trim(),
      publisher: String(parsed.publisher ?? candidate.fullName.split("/")[0]).trim(),
      description,
      downloadUrl: buildGithubZipUrl(candidate.link, candidate.defaultBranch),
      category: sanitizeCategories(parsed.category as Category[]),
      sourceRepoName: candidate.fullName,
      permissions: mapAiPermissions(parsed.permissions),
      verificationPercentage,
      verified: mapAiVerified(parsed.verified, verificationPercentage),
      extensionStatus: "premium",
    };
  } catch {
    return null;
  }
}
