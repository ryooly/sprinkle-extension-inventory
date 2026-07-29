import * as service from "../services/services";
import { AppError } from "@/middlewares/errorHandler";
import type {
  CreateExtensionPayload,
  UpdateExtensionPayload,
  CategoryInput,
  BrowserInput,
} from "../schemas/ekstension-input";
import type { Extension } from "../../automation-engine/db/schema";
export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export async function handleCreateExtension(
  payload: CreateExtensionPayload,
): Promise<ControllerResult<Extension>> {
  try {
    const result = await service.createExtension(payload);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to create extension`, 500, { cause: err });
  }
}

export async function handleEditExtension(
  payload: UpdateExtensionPayload,
): Promise<ControllerResult<Extension>> {
  try {
    const result = await service.editExtension(payload);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to update extension "${payload.id}"`, 500, {
      cause: err,
    });
  }
}

export async function handleRemoveExtension(
  id: string,
): Promise<ControllerResult<Extension>> {
  try {
    const result = await service.removeExtension(id);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to delete extension "${id}"`, 500, {
      cause: err,
    });
  }
}

export async function handleSearchExtensionsByName(
  name: string,
): Promise<ControllerResult<Extension[]>> {
  try {
    const result = await service.searchExtensionsByName(name);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to search extensions by name "${name}"`, 500, {
      cause: err,
    });
  }
}

export async function handleSearchExtensionsByCategory(
  category: CategoryInput,
): Promise<ControllerResult<Extension[]>> {
  try {
    const result = await service.searchExtensionsByCategory(category);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to search extensions by category "${category}"`,
      500,
      {
        cause: err,
      },
    );
  }
}

export async function handleSearchExtensionsByBrowser(
  browser: BrowserInput,
): Promise<ControllerResult<Extension[]>> {
  try {
    const result = await service.searchExtensionsByBrowser(browser);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to search extensions by browser "${browser}"`,
      500,
      {
        cause: err,
      },
    );
  }
}
