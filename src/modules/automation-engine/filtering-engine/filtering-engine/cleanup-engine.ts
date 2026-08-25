import { deleteStaleExtensions } from "../repository/cleanup-repository";

const DELETE_LIMIT = 10;

export async function cleanupStaleExtensions() {
  return await deleteStaleExtensions(DELETE_LIMIT);
}


// need to be improved in return area so loging can give better informtationcz