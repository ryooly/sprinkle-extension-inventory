import {
  findExtensions,
  incrementAmountDisplayed,
} from "../repository/repository";
import { AppError } from "@/errorhandler";

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getExtensions(): Promise<EngineResult<unknown>> {
  try {
    const data = await findExtensions();

    for (const extension of data) {
      await incrementAmountDisplayed(extension.id);
    }

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions`, 500, { cause: err });
  }
}
