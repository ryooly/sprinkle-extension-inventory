import { AppError } from "@/errorhandler";
import type { Comment, SubComment } from "@/models";
import {
  addComment,
  addSubComment,
  deleteComment,
  deleteSubComment,
  listComments,
  type AddCommentInput,
  type AddSubCommentInput,
  type DeleteCommentInput,
  type DeleteSubCommentInput,
  type CommentView,
} from "../services/comment-services";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
}

export async function handleListComments(
  extensionId: string,
): Promise<ControllerResult<CommentView[]>> {
  try {
    const data = await listComments(extensionId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to list comments", 500, { cause: err });
  }
}

export async function handleAddComment(
  input: AddCommentInput,
): Promise<ControllerResult<Comment>> {
  try {
    const data = await addComment(input);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to add comment", 500, { cause: err });
  }
}

export async function handleAddSubComment(
  input: AddSubCommentInput,
): Promise<ControllerResult<SubComment>> {
  try {
    const data = await addSubComment(input);
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to add sub-comment", 500, { cause: err });
  }
}

export async function handleDeleteComment(
  input: DeleteCommentInput,
): Promise<ControllerResult<{ id: string }>> {
  try {
    const data = await deleteComment(input);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to delete comment", 500, { cause: err });
  }
}

export async function handleDeleteSubComment(
  input: DeleteSubCommentInput,
): Promise<ControllerResult<{ id: string }>> {
  try {
    const data = await deleteSubComment(input);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to delete reply", 500, { cause: err });
  }
}
