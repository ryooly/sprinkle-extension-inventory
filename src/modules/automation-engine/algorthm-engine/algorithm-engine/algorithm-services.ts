import {
  findExtensions,
  incrementAmountDisplayed,
  findUserExtensions,
  findPremiumExtensions,
} from "../repository/repository";
import { AppError } from "@/middlewares/errorHandler";

export interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL = "http://localhost:3000"; // sesuaikan dengan base URL backend kamu

export async function getExtensions(): Promise<EngineResult<unknown>> {
  try {
    const data = await findExtensions();

    for (const extension of data) {
      await incrementAmountDisplayed(extension.id); // lemah aku rasa akan berat kalo di push satu per satu gitu 
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

export async function getPremiumEkstension(): Promise<EngineResult<unknown>> {
  try {
    const data = await findPremiumExtensions();

    for (const extension of data) {
      await incrementAmountDisplayed(extension.id);
    }

    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to fetch premium extensions`, 500, {
      cause: err,
    });
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

/// NOT FINSIHED YET - UNDER DEVELOPMENT DIPERLUKAN SEBAUH CARA AGAR PENGAMBILANNYA MERATA DAN SEMUA KENA.


