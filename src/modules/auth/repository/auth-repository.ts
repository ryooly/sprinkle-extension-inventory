import { eq, or } from "drizzle-orm";
import { db } from "@/modules/auth/db/client";
import { accounts, saved, inventory, refreshTokens } from "@/modules/auth/db/schema";
import {
  RegisterInput,
  LoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
  GetUserByIdInput,
  NewRefreshTokenInput,
} from "@/modules/auth/schemas/auth-schema";

export const UserRepository = {
  insertNewUser: async (body: RegisterInput) => {
    return await db.transaction(async (tx) => {
      const [newAccount] = await tx
        .insert(accounts)
        .values({
          username: body.username,
          email: body.email,
          password: body.password,
        })
        .returning();

      await tx.insert(saved).values({ ownerId: newAccount.id });

      return newAccount;
    });
  },

  login: async (body: LoginInput) => {
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, body.email))
      .limit(1);

    return account[0] ?? null;
  },

  upToBuilder: async (body: BeBuilderInput) => {
    return await db.transaction(async (tx) => {
      const [updatedAccount] = await tx
        .update(accounts)
        .set({ role: "builder" })
        .where(eq(accounts.id, body.accountId))
        .returning();

      await tx.insert(inventory).values({ ownerId: updatedAccount.id });

      return updatedAccount;
    });
  },

  findUserById: async (params: GetUserByIdInput) => {
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, params.id))
      .limit(1);

    return account[0] ?? null;
  },

  findByUsername: async (params: GetUserByUsernameInput) => {
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.username, params.username))
      .limit(1);

    return account[0] ?? null;
  },

  findByUsernameOrEmail: async (username: string, email: string) => {
    const account = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.username, username), eq(accounts.email, email)))
      .limit(1);

    return account[0] ?? null;
  },

  createNewToken: async (data: NewRefreshTokenInput) => {
    const [newToken] = await db.insert(refreshTokens).values(data).returning();

    return newToken;
  },

  updateToken: async (accountId: string, newToken: string, expiresAt: Date) => {
    const [updatedToken] = await db
      .update(refreshTokens)
      .set({ token: newToken, expiresAt })
      .where(eq(refreshTokens.accountId, accountId))
      .returning();

    return updatedToken;
  },
};
