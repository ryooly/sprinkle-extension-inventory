import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { comments, subComments, extensions, accounts } from "@/models";
import type { Comment, NewComment, SubComment, NewSubComment } from "@/models";

export interface CommentRow {
  id: string;
  commentId?: string;
  extensionId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function findExtensionById(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: extensions.id })
    .from(extensions)
    .where(eq(extensions.id, id))
    .limit(1);

  return row !== undefined;
}

export async function listCommentsByExtension(
  extensionId: string,
): Promise<CommentRow[]> {
  return await db
    .select({
      id: comments.id,
      extensionId: comments.extensionId,
      authorId: comments.authorId,
      authorUsername: accounts.username,
      content: comments.content,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .innerJoin(accounts, eq(comments.authorId, accounts.id))
    .where(eq(comments.extensionId, extensionId))
    .orderBy(comments.createdAt);
}

export async function listSubCommentsByExtension(
  extensionId: string,
): Promise<CommentRow[]> {
  return await db
    .select({
      id: subComments.id,
      commentId: subComments.commentId,
      extensionId: subComments.extensionId,
      authorId: subComments.authorId,
      authorUsername: accounts.username,
      content: subComments.content,
      createdAt: subComments.createdAt,
      updatedAt: subComments.updatedAt,
    })
    .from(subComments)
    .innerJoin(accounts, eq(subComments.authorId, accounts.id))
    .where(eq(subComments.extensionId, extensionId))
    .orderBy(subComments.createdAt);
}

export async function findCommentById(
  id: string,
): Promise<Comment | undefined> {
  const [row] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  return row;
}

export async function findSubCommentById(
  id: string,
): Promise<SubComment | undefined> {
  const [row] = await db
    .select()
    .from(subComments)
    .where(eq(subComments.id, id))
    .limit(1);

  return row;
}

export async function removeCommentById(id: string): Promise<Comment | undefined> {
  const [row] = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();

  return row;
}

export async function removeSubCommentById(
  id: string,
): Promise<SubComment | undefined> {
  const [row] = await db
    .delete(subComments)
    .where(eq(subComments.id, id))
    .returning();

  return row;
}

export async function insertComment(
  input: NewComment,
): Promise<Comment | undefined> {
  const [row] = await db.insert(comments).values(input).returning();

  return row;
}

export async function insertSubComment(
  input: NewSubComment,
): Promise<SubComment | undefined> {
  const [row] = await db.insert(subComments).values(input).returning();

  return row;
}
