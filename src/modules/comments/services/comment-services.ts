import { AppError } from "@/errorhandler";
import type { Comment, SubComment } from "@/models";
import {
  findCommentById,
  findExtensionById,
  insertComment,
  insertSubComment,
} from "../repository/comment-repository";

export interface AddCommentInput {
  userId: string;
  extensionId: string;
  content: string;
}

export interface AddSubCommentInput {
  userId: string;
  commentId: string;
  content: string;
}

export async function addComment(input: AddCommentInput): Promise<Comment> {
  const exists = await findExtensionById(input.extensionId);
  if (!exists) {
    throw new AppError(`Extension "${input.extensionId}" not found`, 404);
  }

  const created = await insertComment({
    authorId: input.userId,
    extensionId: input.extensionId,
    content: input.content.trim(),
  });

  if (!created) {
    throw new AppError("Failed to create comment", 500);
  }

  return created;
}

export async function addSubComment(
  input: AddSubCommentInput,
): Promise<SubComment> {
  const parent = await findCommentById(input.commentId);
  if (!parent) {
    throw new AppError(`Comment "${input.commentId}" not found`, 404);
  }

  const created = await insertSubComment({
    commentId: input.commentId,
    authorId: input.userId,
    extensionId: parent.extensionId,
    content: input.content.trim(),
  });

  if (!created) {
    throw new AppError("Failed to create sub-comment", 500);
  }

  return created;
}
