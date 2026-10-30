import { AppError } from "@/errorhandler";
import type { Comment, SubComment } from "@/models";
import {
  findCommentById,
  findExtensionById,
  findSubCommentById,
  insertComment,
  insertSubComment,
  listCommentsByExtension,
  listSubCommentsByExtension,
  removeCommentById,
  removeSubCommentById,
  type CommentRow,
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

export interface DeleteCommentInput {
  userId: string;
  commentId: string;
}

export interface DeleteSubCommentInput {
  userId: string;
  replyId: string;
}

export interface CommentView extends CommentRow {
  replies: CommentRow[];
}

export async function listComments(
  extensionId: string,
): Promise<CommentView[]> {
  const exists = await findExtensionById(extensionId);
  if (!exists) {
    throw new AppError(`Extension "${extensionId}" not found`, 404);
  }

  const [thread, replies] = await Promise.all([
    listCommentsByExtension(extensionId),
    listSubCommentsByExtension(extensionId),
  ]);

  return thread.map((entry) => ({
    ...entry,
    replies: replies.filter((reply) => reply.commentId === entry.id),
  }));
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

export async function deleteComment(input: DeleteCommentInput): Promise<Comment> {
  const parent = await findCommentById(input.commentId);
  if (!parent) {
    throw new AppError(`Comment "${input.commentId}" not found`, 404);
  }

  if (parent.authorId !== input.userId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  const removed = await removeCommentById(input.commentId);
  if (!removed) {
    throw new AppError("Failed to delete comment", 500);
  }

  return removed;
}

export async function deleteSubComment(
  input: DeleteSubCommentInput,
): Promise<SubComment> {
  const reply = await findSubCommentById(input.replyId);
  if (!reply) {
    throw new AppError(`Reply "${input.replyId}" not found`, 404);
  }

  if (reply.authorId !== input.userId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  const removed = await removeSubCommentById(input.replyId);
  if (!removed) {
    throw new AppError("Failed to delete reply", 500);
  }

  return removed;
}
