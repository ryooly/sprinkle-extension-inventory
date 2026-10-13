import {
  incrementViews,
  incrementDownloads,
  incrementAmountDisplayed,
  findSavedByOwnerAndExt,
  listSavedExtensions,
  insertSavedExtension,
  deleteSavedExtension,
} from "../repository/repository";
import { AppError } from "@/errorhandler";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export async function handleIncrementView(
  id: string,
): Promise<ControllerResult<unknown>> {
  try {
    const updated = await incrementViews(id);

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to increment views for "${id}"`, 500, {
      cause: err,
    });
  }
}

export async function handleIncrementDownload(
  id: string,
): Promise<ControllerResult<unknown>> {
  try {
    const updated = await incrementDownloads(id);

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to increment downloads for "${id}"`, 500, {
      cause: err,
    });
  }
}

export async function handleIncrementAmountDisplayed(
  id: string,
): Promise<ControllerResult<unknown>> {
  try {
    const updated = await incrementAmountDisplayed(id);

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to increment amountDisplayed for "${id}"`, 500, {
      cause: err,
    });
  }
}

export async function handleListSaved(
  userId: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await listSavedExtensions(userId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to list saved extensions", 500, { cause: err });
  }
}

export async function handleSaveExtension(
  userId: string,
  extensionId: string,
): Promise<ControllerResult<unknown>> {
  try {
    const existing = await findSavedByOwnerAndExt(userId, extensionId);
    if (existing)
      throw new AppError(
        `Extension with id "${extensionId}" is already saved by this user`,
        409,
      );

    const created = await insertSavedExtension(userId, extensionId);
    if (!created)
      throw new AppError(
        `Extension with id "${extensionId}" is already saved by this user`,
        409,
      );

    return { success: true, data: created };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to save extension "${extensionId}"`, 500, {
      cause: err,
    });
  }
}

export async function handleUnsaveExtension(
  userId: string,
  extensionId: string,
): Promise<ControllerResult<unknown>> {
  try {
    const removed = await deleteSavedExtension(userId, extensionId);
    if (!removed)
      throw new AppError(
        `Extension with id "${extensionId}" is not in saved list`,
        404,
      );

    return { success: true, data: removed };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to unsave extension "${extensionId}"`, 500, {
      cause: err,
    });
  }
}
