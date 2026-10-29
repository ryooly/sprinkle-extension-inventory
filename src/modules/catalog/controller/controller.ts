import { AppError } from "@/errorhandler";
import {
  getCatalogExtension,
  getCatalogExtensionBundle,
  listCatalogExtensions,
  type CatalogBundleResult,
  type CatalogQueryInput,
} from "../services/catalog-service";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export async function handleListCatalogExtensions(
  query: CatalogQueryInput,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await listCatalogExtensions(query);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to list extensions", 500, { cause: err });
  }
}

export async function handleGetCatalogExtension(
  id: string,
): Promise<ControllerResult<unknown>> {
  try {
    const data = await getCatalogExtension(id);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to get extension "${id}"`, 500, { cause: err });
  }
}

export async function handleGetCatalogExtensionBundle(
  id: string,
): Promise<ControllerResult<CatalogBundleResult>> {
  try {
    const data = await getCatalogExtensionBundle(id);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to prepare the download for "${id}"`, 500, {
      cause: err,
    });
  }
}
