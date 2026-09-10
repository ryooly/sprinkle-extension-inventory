import { AppError } from "@/middlewares/errorHandler";
import { getDailyShowcase } from "../services/showcase-service";

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
