import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { AppError } from "@/errorhandler";
import {
  addCommentSchema,
  addSubCommentSchema,
} from "@/schemas/comment-validator";
import {
  handleAddComment,
  handleAddSubComment,
  handleDeleteComment,
  handleDeleteSubComment,
  handleListComments,
} from "../controller/controller";

export const commentRoutes = new Elysia({ prefix: "/comments" })
  .use(authMiddleware)
  .get(
    "/extension/:extensionId",
    async ({ params }) => {
      return handleListComments(params.extensionId);
    },
    {
      params: t.Object({ extensionId: t.String({ format: "uuid" }) }),
    },
  )
  .post(
    "/extension/:extensionId",
    async ({ user, params, body }) => {
      const userId = (user as { userId?: string } | undefined)?.userId;
      if (!userId) throw new AppError("Authentication required", 401);

      return handleAddComment({
        userId,
        extensionId: params.extensionId,
        content: body.content,
      });
    },
    {
      params: t.Object({ extensionId: t.String({ format: "uuid" }) }),
      body: addCommentSchema,
    },
  )
  .post(
    "/:commentId/replies",
    async ({ user, params, body }) => {
      const userId = (user as { userId?: string } | undefined)?.userId;
      if (!userId) throw new AppError("Authentication required", 401);

      return handleAddSubComment({
        userId,
        commentId: params.commentId,
        content: body.content,
      });
    },
    {
      params: t.Object({ commentId: t.String({ format: "uuid" }) }),
      body: addSubCommentSchema,
    },
  )
  .delete(
    "/:commentId",
    async ({ user, params }) => {
      const userId = (user as { userId?: string } | undefined)?.userId;
      if (!userId) throw new AppError("Authentication required", 401);

      return handleDeleteComment({ userId, commentId: params.commentId });
    },
    {
      params: t.Object({ commentId: t.String({ format: "uuid" }) }),
    },
  )
  .delete(
    "/replies/:replyId",
    async ({ user, params }) => {
      const userId = (user as { userId?: string } | undefined)?.userId;
      if (!userId) throw new AppError("Authentication required", 401);

      return handleDeleteSubComment({ userId, replyId: params.replyId });
    },
    {
      params: t.Object({ replyId: t.String({ format: "uuid" }) }),
    },
  );
