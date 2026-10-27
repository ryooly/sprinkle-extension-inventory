import {
  createExtension,
  createFetchedRepo,
  findExtensionByNameAndDeveloper,
} from "../repository/saving-repository";
import type { ExtensionRepo } from "../../github-explorer/api-engine";
import type { Category, Extension } from "@/models";
import { AppError } from "@/errorhandler";
import { logger } from "@/logger";
import {
  ExtensionUtils,
  computeSecurityScore,
  processLocalPackage,
  generateAutomationHashtags,
  processUserHashtags,
  type ExtensionUploadData,
} from "../../depends/extension-utils";

export interface InsertGithubResult {
  inserted: number;
  failed: number;
  skipped: number;
  failures: Array<{ name: string; reason: string }>;
}

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function markRepoAsFetched(sourceRepoName?: string) {
  if (!sourceRepoName) return;
  await createFetchedRepo(sourceRepoName);
}

export async function insertExtensionsFromGithub(
  repos: ExtensionRepo[],
): Promise<EngineResult<InsertGithubResult>> {
  let inserted = 0;
  let failed = 0;
  let skipped = 0;
  const failures: InsertGithubResult["failures"] = [];

  // One shared client instance for the whole batch: Octokit is created once
  // and reused across every repo instead of per call.
  const ext = new ExtensionUtils();

  for (const repo of repos) {
    const validated = ext.validateRepo(repo);

    if (!validated.valid) {
      failed++;
      failures.push({ name: repo.name ?? "unknown", reason: validated.reason });
      continue;
    }

    const normalized = validated.data;

    const license = normalized.licenseKey
      ? await ext.fetchLicenseDetails(normalized.licenseKey)
      : null;

    const repoFullName = normalized.sourceRepoName ?? normalized.name;
    const [owner, ...repoSegments] = repoFullName.split("/");
    const repoName = repoSegments.join("/");
    const supportedBrowsers = await ext.detectBrowserSupport(owner, repoName);
    const manifestPermissions = await ext.detectManifestPermissions(
      owner,
      repoName,
    );
    const [frontendLanguages, backendLanguages] = await ext.detectLanguages(
      owner,
      repoName,
    );
    const lastCommitDate = await ext.getLastCommitDate(owner, repoName);
    const repoMetrics = await ext.getRepositoryMetrics(owner, repoName);
    const repoFiles = await ext.getRepoFiles(owner, repoName);
    const readme = await ext.getReadmeContent(owner, repoName);

    const defaultBranch = ext.parseZipUrl(
      normalized.downloadUrl,
    )?.defaultBranch;
    const endpoints = await ext.findApi(owner, repoName, defaultBranch);
    const apiEndpoints = endpoints.map(
      (e) => `${e.type}:${e.method} ${e.path}`,
    );

    const effectivePermissions =
      manifestPermissions.length > 0
        ? manifestPermissions
        : normalized.permissions;

    const security = ext.computeSecurityScore({
      endpoints,
      permissions: effectivePermissions,
    });

    const repoRating = ext.rateRepository(repoMetrics);
    logger.info(
      {
        name: normalized.name,
        grade: repoRating.grade,
        totalScore: repoRating.totalScore,
        breakdown: repoRating.breakdown,
      },
      "repository trust rating computed",
    );
    logger.info(
      {
        name: normalized.name,
        securityScore: security.score,
        breakdown: security.breakdown,
        risks: security.risks,
      },
      "extension security score computed",
    );

    try {
      const existing = await findExtensionByNameAndDeveloper(
        normalized.name,
        normalized.publisher,
      );

      if (existing) {
        skipped++;
        await markRepoAsFetched(normalized.sourceRepoName);
        continue;
      }

      const unsafeEndpoint = endpoints.find((e) => !e.security.safe);

      if (unsafeEndpoint) {
        skipped++;
        logger.warn(
          {
            name: normalized.name,
            endpoint: unsafeEndpoint.path,
            threats: unsafeEndpoint.security.threats,
          },
          "skipped extension: API endpoint flagged unsafe by Safe Browsing",
        );
        await markRepoAsFetched(normalized.sourceRepoName);
        continue;
      }

      await createExtension({
        name: normalized.name,
        description: normalized.description,
        developer: normalized.publisher,
        extensionLink: normalized.downloadUrl,
        source: "github",
        categories: normalized.category,
        hashtags: generateAutomationHashtags({
          categories: normalized.category,
          languages: [...frontendLanguages, ...backendLanguages],
        }),
        extensionStatus: normalized.extensionStatus ?? "basic",
        permissions: effectivePermissions,
        supportedBrowsers,
        frontendLanguages:
          frontendLanguages.length > 0
            ? frontendLanguages
            : (normalized.frontendLanguages ?? null),
        backendLanguages:
          backendLanguages.length > 0
            ? backendLanguages
            : (normalized.backendLanguages ?? null),
        lastCommitDate: lastCommitDate ?? normalized.lastCommitDate ?? null,
        stars: repoMetrics.stargazers_count || normalized.stars || null,
        repoFiles:
          repoFiles.length > 0 ? repoFiles : (normalized.repoFiles ?? null),
        apiEndpoints: apiEndpoints.length > 0 ? apiEndpoints : null,
        securityScore: security.score,
        announcement: readme ?? normalized.description,
        licenseName: license?.name ?? normalized.licenseName ?? null,
        licenseKey: normalized.licenseKey ?? license?.name ?? null,
        licenseDescription: license?.description ?? null,
        licensePermissions: license?.permissions ?? null,
        licenseConditions: license?.conditions ?? null,
        licenseLimitations: license?.limitations ?? null,
        licenseUrl: license?.url || normalized.licenseUrl || null,
      });

      await markRepoAsFetched(normalized.sourceRepoName);
      inserted++;
    } catch (error) {
      failed++;
      const reason =
        error instanceof Error ? error.message : "unknown insert error";
      failures.push({ name: normalized.name, reason });
      logger.error(
        { err: error, name: normalized.name },
        "Failed to insert extension",
      );
    }
  }

  return {
    success: failed === 0,
    data: {
      inserted,
      failed,
      skipped,
      failures,
    },
  };
}

export interface UserUploadInput {
  data: ExtensionUploadData;
  extensionLink: string;
  bytes: Uint8Array;
}

export async function insertExtensionFromUpload(
  input: UserUploadInput,
): Promise<Extension> {
  const { data, extensionLink, bytes } = input;

  const local = processLocalPackage(bytes);

  const security = computeSecurityScore({
    endpoints: local.apiEndpoints,
    permissions: local.permissions,
  });

  const result = await createExtension({
    name: data.name,
    description: data.description,
    developer: data.developer,
    extensionLink,
    publishedBy: "user",
    categories: data.categories as Category[],
    hashtags: processUserHashtags(data.hashtags),
    supportedBrowsers:
      local.supportedBrowsers.length > 0
        ? local.supportedBrowsers
        : data.supportedBrowsers,
    permissions: local.permissions.length > 0 ? local.permissions : undefined,
    frontendLanguages:
      local.frontendLanguages.length > 0 ? local.frontendLanguages : null,
    backendLanguages:
      local.backendLanguages.length > 0 ? local.backendLanguages : null,
    repoFiles: local.repoFiles.length > 0 ? local.repoFiles : null,
    apiEndpoints: local.apiEndpoints.length > 0 ? local.apiEndpoints : null,
    securityScore: security.score,
    announcement: local.readme ?? data.description,
  });

  if (!result) {
    throw new AppError("Failed to create extension", 500);
  }

  logger.info(
    {
      name: data.name,
      files: local.repoFiles.length,
      endpoints: local.apiEndpoints.length,
      securityScore: security.score,
      breakdown: security.breakdown,
      risks: security.risks,
    },
    "user extension created from upload",
  );

  return result;
}
