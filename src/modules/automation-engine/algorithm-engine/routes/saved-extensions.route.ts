import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { AppError } from "@/errorhandler";
import {
  handleListSaved,
  handleSaveExtension,
  handleUnsaveExtension,
} from "../controller/controller";

export const savedExtensionRoutes = new Elysia({ prefix: "/saved-extensions" })
  .use(authMiddleware)
  .get("/", async ({ user }) => {
    const userId = user?.userId;
    if (!userId) throw new AppError("Authentication required", 401);
    return handleListSaved(userId);
  })
  .post(
    "/:extensionId",
    async ({ user, params }) => {
      const userId = user?.userId;
      if (!userId) throw new AppError("Authentication required", 401);
      return handleSaveExtension(userId, params.extensionId);
    },
    { params: t.Object({ extensionId: t.String({ format: "uuid" }) }) },
  )
  .delete(
    "/:extensionId",
    async ({ user, params }) => {
      const userId = user?.userId;
      if (!userId) throw new AppError("Authentication required", 401);
      return handleUnsaveExtension(userId, params.extensionId);
    },
    { params: t.Object({ extensionId: t.String({ format: "uuid" }) }) },
  );
