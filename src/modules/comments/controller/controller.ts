import { AppError } from "@/errorhandler";
import type { Comment, SubComment } from "@/models";
import {
  addComment,
  addSubComment,
  type AddCommentInput,
  type AddSubCommentInput,
} from "../services/comment-services";

export interface ControllerResult<T> {
  success: boolean;
  data?: T;
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
