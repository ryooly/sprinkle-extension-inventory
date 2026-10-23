import { AppError } from "@/errorhandler";
import {
  getDailyShowcase,
  getPremiumShowcase,
} from "../services/showcase-service";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export async function handleGetDailyShowcase(
  date?: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await getDailyShowcase(date);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to get daily showcase", 500, { cause: err });
  }
}

export async function handleGetPremiumShowcase(
  date?: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await getPremiumShowcase(date);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to get premium showcase", 500, { cause: err });
  }
}
