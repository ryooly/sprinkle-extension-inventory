import {
  findExtensions,
  incrementAmountDisplayed,
  findUserExtensions,
} from "../repository/repository";
import { AppError } from "@/middlewares/errorHandler";
import { config } from "config";

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL = config.apiBaseUrl;

export async function getExtensions(): Promise<EngineResult<unknown>> {
  try {
    const data = await findExtensions();

    for (const extension of data) {
      await incrementAmountDisplayed(extension.id); // akan dihapus aja dan diganti dengan yang lain 
    }

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions`, 500, { cause: err });
  }
}

export async function getManualExtension(): Promise<EngineResult<unknown>> {
  try {
    const data = await findUserExtensions();

    for (const extension of data) {
      await incrementAmountDisplayed(extension.id);
    }

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch extensions`, 500, { cause: err });
  }
}

export async function incrementView(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/extensions/${id}/view`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new AppError(
        `Failed to increment view for extension ${id}`,
        res.status,
        {
          cause: data,
        },
      );
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to increment view for extension ${id}`, 500, {
      cause: err,
    });
  }
}

export async function incrementDownload(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/extensions/${id}/download`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new AppError(
        `Failed to increment download for extension ${id}`,
        res.status,
        {
          cause: data,
        },
      );
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to increment download for extension ${id}`,
      500,
      { cause: err },
    );
  }
}

