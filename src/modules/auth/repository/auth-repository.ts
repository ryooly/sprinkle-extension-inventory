import { eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, saved, inventory, refreshTokens } from "@/models";
import { loginDbg } from "@/modules/auth/utils/loginDebug";
import {
  RegisterInput,
  LoginCredentials,
  BeBuilderInput,
  GetUserByUsernameInput,
  GetUserByIdInput,
  NewRefreshTokenInput,
} from "@/schemas/auth";

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

  findByEmail: async (email: string) => {
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1);

    return account[0] ?? null;
  },

  findByLoginCredentials: async (credentials: LoginCredentials) => {
    const found =
      credentials.kind === "email"
        ? await UserRepository.findByEmail(credentials.value)
        : await UserRepository.findByUsername({ username: credentials.value });

    loginDbg("repo:lookup", {
      kind: credentials.kind,
      column:
        credentials.kind === "email" ? "accounts.email" : "accounts.username",
      value: credentials.value,
      found: Boolean(found),
      accountId: found?.id ?? null,
      accountUsername: found?.username ?? null,
    });

    return found;
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

  updateProfile: async (
    accountId: string,
    data: { username?: string; email?: string },
  ) => {
    const patch: {
      username?: string;
      email?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (data.username !== undefined) patch.username = data.username;
    if (data.email !== undefined) patch.email = data.email;

    const [updatedAccount] = await db
      .update(accounts)
      .set(patch)
      .where(eq(accounts.id, accountId))
      .returning();

    return updatedAccount ?? null;
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

  replaceToken: async (
    accountId: string,
    newToken: string,
    expiresAt: Date,
  ) => {
    return await db.transaction(async (tx) => {
      await tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.accountId, accountId));

      const [createdToken] = await tx
        .insert(refreshTokens)
        .values({ accountId, token: newToken, expiresAt })
        .returning();

      return createdToken;
    });
  },
};
