import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const beBuilderSchema = z.object({
  accountId: z.string().uuid(),
});

export const getUserByUsernameSchema = z.object({
  username: z.string().min(3).max(50),
});

export const getUserByIdSchema = z.object({
  id: z.string().uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BeBuilderInput = z.infer<typeof beBuilderSchema>;
export type GetUserByUsernameInput = z.infer<typeof getUserByUsernameSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;

export const newRefreshTokenSchema = z.object({
  accountId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
});

export type NewRefreshTokenInput = z.infer<typeof newRefreshTokenSchema>;
