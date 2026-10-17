import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { comments, subComments, extensions } from "@/models";
import type { Comment, NewComment, SubComment, NewSubComment } from "@/models";

export async function findExtensionById(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: extensions.id })
    .from(extensions)
    .where(eq(extensions.id, id))
    .limit(1);

  return row !== undefined;
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
