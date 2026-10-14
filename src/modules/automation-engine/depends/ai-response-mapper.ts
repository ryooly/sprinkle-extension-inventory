import type { Category, VerificationStatus } from "@/models";
import type { ExtensionRepo } from "../github-explorer/api-engine";
import {
  buildGithubZipUrl,
  sanitizeCategories,
  mapManifestPermissions,
} from "./extension-utils";

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

    const licenseName =
      typeof parsed.licenseName === "string"
        ? parsed.licenseName.trim()
        : typeof parsed.license === "string"
          ? parsed.license.trim()
          : undefined;

    const licenseUrl =
      typeof parsed.licenseUrl === "string"
        ? parsed.licenseUrl.trim()
        : undefined;

    return {
      name: String(parsed.name).trim(),
      publisher: String(
        parsed.publisher ?? candidate.fullName.split("/")[0],
      ).trim(),
      description,
      downloadUrl: buildGithubZipUrl(candidate.link, candidate.defaultBranch),
      category: sanitizeCategories(parsed.category as Category[]),
      sourceRepoName: candidate.fullName,
      permissions: mapManifestPermissions(parsed.permissions),
      verificationPercentage,
      verified: mapAiVerified(parsed.verified, verificationPercentage),
      extensionStatus: "premium",
      licenseKey: licenseName
        ? licenseName.toLowerCase().replace(/\s+/g, "-")
        : undefined,
      licenseName,
      licenseUrl,
    };
  } catch {
    return null;
  }
}
