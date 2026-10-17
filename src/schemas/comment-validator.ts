import { t } from "elysia";

export const addCommentSchema = t.Object({
  content: t.String({ minLength: 1, maxLength: 2000 }),
});

export const addSubCommentSchema = t.Object({
  content: t.String({ minLength: 1, maxLength: 2000 }),
});
