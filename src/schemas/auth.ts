import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginKindSchema = z.enum(["email", "username"]);

export const loginSchema = z
  .object({
    identifier: z.string().min(3).max(255).optional(),
    email: z.string().email().max(255).optional(),
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(8),
  })
  .refine((body) => Boolean(body.identifier ?? body.email ?? body.username), {
    message: "identifier, email, or username is required",
  });

export const emailLoginSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

export const beBuilderSchema = z.object({
  accountId: z.string().uuid(),
});

export const getUserByUsernameSchema = z.object({
  username: z.string().min(3).max(50),
});

export const updateProfileSchema = z
  .object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().max(255).optional(),
  })
  .refine((body) => body.username !== undefined || body.email !== undefined, {
    message: "username or email is required",
  });

export const getUserByIdSchema = z.object({
  id: z.string().uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginKind = z.infer<typeof loginKindSchema>;
export type LoginCredentials = {
  value: string;
  kind: LoginKind;
};
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type BeBuilderInput = z.infer<typeof beBuilderSchema>;
export type GetUserByUsernameInput = z.infer<typeof getUserByUsernameSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface UpdateProfileCommand extends UpdateProfileInput {
  userId: string;
}

export const newRefreshTokenSchema = z.object({
  accountId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
});

export type NewRefreshTokenInput = z.infer<typeof newRefreshTokenSchema>;
