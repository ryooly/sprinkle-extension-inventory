import * as repo from "../../automation-engine/saving-engine/repository/saving-repository";
import {
  parseGithubZipUrl,
  fetchRepoFile,
} from "../../automation-engine/depends/extension-utils";
import { AppError } from "@/errorhandler";
import type {
  CreateExtensionPayload,
  UpdateExtensionPayload,
  CategoryInput,
  BrowserInput,
} from "@/schemas/extension-input";
import type { Extension } from "@/models";

export async function createExtension(
  payload: CreateExtensionPayload,
): Promise<Extension> {
  const result = await repo.createExtension({
    ...payload,
    publishedBy: "user",
  });

  if (!result) {
    throw new AppError(`Failed to create extension`, 500);
  }

  return result;
}

export async function editExtension(
  payload: UpdateExtensionPayload,
): Promise<Extension> {
  const result = await repo.updateExtension(payload);

  if (!result) {
    throw new AppError(`Extension with id "${payload.id}" not found`, 404);
  }

  return result;
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
    throw new AppError(
      `Extension "${extension.name}" is not linked to a GitHub repository`,
      400,
    );
  }

  const [, , , ownerSegment = "", repoSegment = ""] =
    parsed.repoUrl.split("/");

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


