import * as repo from "../../automation-engine/saving-engine/repository/saving-repository";
import {
  parseGithubZipUrl,
  fetchRepoFile,
  validateExtensionUpload,
  toHashtagToken,
} from "../../automation-engine/depends/extension-utils";
import { insertExtensionFromUpload } from "../../automation-engine/saving-engine/saving-engine/save-service";
import { AppError } from "@/errorhandler";
import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { createHash, randomUUID } from "crypto";
import { unzipSync } from "fflate";
import { config } from "config";
import type {
  CreateExtensionUserPayload,
  UpdateExtensionPayload,
  CategoryInput,
  BrowserInput,
} from "@/schemas/extension-input";
import type { Extension } from "@/models";

export async function createExtension(
  payload: CreateExtensionUserPayload,
): Promise<Extension> {
  const { file } = payload;

  const upload = await validateExtensionUpload(payload);

  if (!upload.valid) {
    throw new AppError("Invalid extension upload", 400, upload.errors);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const uploadDir = resolve(config.uploadDir);
  mkdirSync(uploadDir, { recursive: true });

  const extensionLink = join(uploadDir, `${randomUUID()}.zip`);
  await Bun.write(extensionLink, bytes);

  return insertExtensionFromUpload({
    data: upload.data,
    extensionLink,
    bytes,
  });
}

export async function editExtension(
  payload: UpdateExtensionPayload,
): Promise<Extension> {
  const existing = await repo.findExtensionById(payload.id);

  if (!existing) {
    throw new AppError(`Extension with id "${payload.id}" not found`, 404);
  }

  if (existing.publishedBy !== "user") {
    throw new AppError(
      `Extension "${payload.id}" is not a user extension and cannot be edited`,
      403,
    );
  }

  const result = await repo.updateExtension({
    id: payload.id,
    data: {
      name: payload.data.name,
      description: payload.data.description,
    },
    categories: payload.categories,
    hashtags: normalizeHashtags(payload.hashtags),
  });

  if (!result) {
    throw new AppError(`Extension with id "${payload.id}" not found`, 404);
  }

  return result;
}

export function normalizeHashtag(raw: string): string {
  return toHashtagToken(raw);
}

export function normalizeHashtags(raws?: string[]): string[] | undefined {
  if (!raws) return undefined;

  return [
    ...new Set(raws.map(normalizeHashtag).filter((tag) => tag.length > 0)),
  ];
}

export async function removeExtension(id: string): Promise<Extension> {
  const result = await repo.deleteExtension(id);

  if (!result) {
    throw new AppError(`Extension with id "${id}" not found`, 404);
  }

  return result;
}

export async function searchExtensionsByName(
  name: string,
): Promise<Extension[]> {
  const term = name.trim();

  if (term.length === 0) {
    throw new AppError("Search term must not be empty", 400);
  }

  const result = await repo.findExtensionsByName(term);

  if (!result.length) {
    throw new AppError(`No extensions found with name "${term}"`, 404);
  }

  return result;
}

export async function searchExtensionsByCategory(
  category: CategoryInput,
): Promise<Extension[]> {
  const result = await repo.findExtensionsByCategory(category);

  if (!result.length) {
    throw new AppError(`No extensions found with category "${category}"`, 404);
  }

  return result;
}

export async function searchExtensionsByHashtag(
  hashtag: string,
): Promise<Extension[]> {
  const normalized = normalizeHashtag(hashtag);

  if (normalized.length === 0) {
    throw new AppError("Hashtag must not be empty", 400);
  }

  const result = await repo.findExtensionsByHashtag(normalized);

  if (!result.length) {
    throw new AppError(`No extensions found with hashtag "${normalized}"`, 404);
  }

  return result;
}

export async function searchExtensionsByBrowser(
  browser: BrowserInput,
): Promise<Extension[]> {
  const result = await repo.findExtensionsByBrowser(browser);

  if (!result.length) {
    throw new AppError(`No extensions found with browser "${browser}"`, 404);
  }

  return result;
}

export const MAX_FILE_CONTENT_BYTES = 1024 * 1024;

export interface RepoFileResult {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding: "utf8" | "base64";
  content: string;
  ref: string;
}

function resolvePackageEntry(
  entries: Record<string, Uint8Array>,
  path: string,
): string | null {
  if (entries[path]) return path;

  const suffix = `/${path}`;

  return Object.keys(entries).find((name) => name.endsWith(suffix)) ?? null;
}

// Extensions published by builders keep their package inside the upload
// directory instead of a GitHub archive, so mirrors the repository reader for
// the files tab without leaving the local disk.
async function readStoredPackageFile(
  extension: Extension,
  path: string,
): Promise<RepoFileResult> {
  const uploadRoot = resolve(config.uploadDir);
  const storedPath = resolve(extension.extensionLink);
  const inside = relative(uploadRoot, storedPath);
  const isStoredPackage =
    inside.length > 0 &&
    !inside.startsWith("..") &&
    !isAbsolute(inside) &&
    existsSync(storedPath);

  if (!isStoredPackage) {
    throw new AppError(
      `Extension "${extension.name}" has no readable package on disk`,
      400,
    );
  }

  const bytes = new Uint8Array(await Bun.file(storedPath).arrayBuffer());
  const entries = unzipSync(bytes, {
    filter: (file) => !file.name.endsWith("/"),
  });

  const entryName = resolvePackageEntry(entries, path);

  if (!entryName) {
    throw new AppError(
      `File "${path}" not found in the package uploaded for "${extension.name}"`,
      404,
    );
  }

  const data = entries[entryName];

  if (data.byteLength > MAX_FILE_CONTENT_BYTES) {
    throw new AppError(
      `File "${entryName}" is too large to open (${data.byteLength} bytes)`,
      413,
    );
  }

  const decoded = new TextDecoder().decode(data);
  const isBinary = decoded.includes("\uFFFD");
  const segments = entryName.split("/");

  return {
    name: segments[segments.length - 1] ?? entryName,
    path: entryName,
    sha: createHash("sha1").update(data).digest("hex"),
    size: data.byteLength,
    encoding: isBinary ? "base64" : "utf8",
    content: isBinary ? Buffer.from(data).toString("base64") : decoded,
    ref: "local-package",
  };
}

export async function openExtensionRepoFile( /// open content of a file in a repository
  id: string,
  path: string,
): Promise<RepoFileResult> {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    throw new AppError("File path must not be empty", 400);
  }

  if (trimmedPath.includes("..") || trimmedPath.startsWith("/")) {
    throw new AppError("Invalid file path", 400);
  }

  const extension = await repo.findExtensionById(id);

  if (!extension) {
    throw new AppError(`Extension with id "${id}" not found`, 404);
  }

  const parsed = parseGithubZipUrl(extension.extensionLink);

  if (!parsed) {
    return await readStoredPackageFile(extension, trimmedPath);
  }

  const [, , , ownerSegment = "", repoSegment = ""] = parsed.repoUrl.split("/");

  if (!ownerSegment || !repoSegment) {
    throw new AppError("Unable to resolve GitHub owner and repository", 400);
  }

  const file = await fetchRepoFile(
    ownerSegment,
    repoSegment,
    trimmedPath,
    parsed.defaultBranch,
  );

  if (!file) {
    throw new AppError(
      `File "${trimmedPath}" not found in repository "${ownerSegment}/${repoSegment}"`,
      404,
    );
  }

  if (file.size > MAX_FILE_CONTENT_BYTES) {
    throw new AppError(
      `File "${file.path}" is too large to open (${file.size} bytes)`,
      413,
    );
  }

  const decoded = Buffer.from(file.content, "base64").toString("utf-8");
  const isBinary = decoded.includes("\uFFFD");

  return {
    name: file.name,
    path: file.path,
    sha: file.sha,
    size: file.size,
    encoding: isBinary ? "base64" : "utf8",
    content: isBinary ? file.content : decoded,
    ref: parsed.defaultBranch,
  };
}
