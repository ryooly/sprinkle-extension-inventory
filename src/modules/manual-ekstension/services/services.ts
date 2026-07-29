// service/extension.service.ts
import * as repo from "../../automation-engine/saving-engine/repository/saving-repository";
import { AppError } from "@/middlewares/errorHandler";
import type {
  CreateExtensionPayload,
  UpdateExtensionPayload,
  CategoryInput,
  BrowserInput,
} from "../schemas/ekstension-input";
import type { Extension } from "../../automation-engine/db/schema";

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
  const result = await repo.findExtensionsByName(name);

  if (!result.length) {
    throw new AppError(`No extensions found with name "${name}"`, 404);
  }

  return result;
}

export async function searchExtensionsByCategory(category: CategoryInput): Promise<Extension[]> {
  const result = await repo.findExtensionsByCategory(category);

  if (!result.length) {
    throw new AppError(`No extensions found with category "${category}"`, 404);
  }

  return result;
};

export async function searchExtensionsByBrowser(browser: BrowserInput): Promise<Extension[]> {
  const result = await repo.findExtensionsByBrowser(browser);

  if (!result.length) {
    throw new AppError(`No extensions found with browser "${browser}"`, 404);
  }

  return result;
};