import {
  incrementViews,
  incrementDownloads,
  incrementAmountDisplayed,
} from "../repository/repository";
import { AppError } from "@/middlewares/errorHandler";

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
    throw new AppError(`Failed to increment views for "${id}"`, 500, {
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
