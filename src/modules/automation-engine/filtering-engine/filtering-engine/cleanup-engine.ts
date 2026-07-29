import { deleteStaleExtensions } from "../repository/cleanup-repository";

const DELETE_LIMIT = 10;

export async function cleanupStaleExtensions() {
  return await deleteStaleExtensions(DELETE_LIMIT);
}