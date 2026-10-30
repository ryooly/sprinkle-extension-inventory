import { UserRepository } from "@/modules/auth/repository/auth-repository";
import { password } from "../utils/bcrypt";
import { isUserAvailable } from "@/modules/auth/utils/userVerification";
import { resolveLoginCredentials } from "@/modules/auth/utils/loginIdentifier";
import {
  loginDbg,
  dbgFields,
  dbgChars,
} from "@/modules/auth/utils/loginDebug";
import { token } from "@/modules/auth/utils/generateJwt";
import {
  RegisterInput,
  LoginInput,
  EmailLoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
  UpdateProfileCommand,
} from "@/schemas/auth";
import { AppError } from "@/errorhandler";
import type { Account } from "@/models";

export class UserService {
  static async register(body: RegisterInput) {
    loginDbg("service:register:enter", {
      username: body.username,
      email: body.email,
      passwordChars: dbgChars(body.password),
    });

    const isAvailable = await isUserAvailable(body.username, body.email);

    loginDbg("service:register:availability-check", {
      username: body.username,
      email: body.email,
      available: isAvailable,
    });

    if (!isAvailable) {
      loginDbg("service:register:reject-user-exists", {
        username: body.username,
        email: body.email,
      });
      throw new AppError("User already exists", 409);
    }

    const hashedPassword = await password.hash(body.password);

    const account = await UserRepository.insertNewUser({
      ...body,
      password: hashedPassword,
    });

    loginDbg("service:register:account-created", {
      accountId: account.id,
      username: account.username,
      role: account.role,
    });

    const accessToken = token.generateAccessToken(account.id);

    const refreshToken = token.generateRefreshToken();

    await UserRepository.createNewToken({
      accountId: account.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      token: accessToken,
      refreshToken,
      data: account,
    };
  }

  static async login(body: LoginInput) {
    loginDbg("service:login:enter", {
      fields: dbgFields(body),
      identifier: body.identifier ?? null,
      email: body.email ?? null,
      username: body.username ?? null,
      passwordChars: dbgChars(body.password),
    });

    const credentials = resolveLoginCredentials(body);

    if (!credentials) {
      loginDbg("service:login:reject-no-credential", {
        fields: dbgFields(body),
      });
      throw new AppError("Email or username is required", 400);
    }

    const existingAccount =
      await UserRepository.findByLoginCredentials(credentials);

    if (!existingAccount) {
      loginDbg("service:login:reject-user-not-found", {
        kind: credentials.kind,
        value: credentials.value,
      });
      throw new AppError("User not found", 409);
    }

    const isPasswordValid = await password.verify(
      body.password,
      existingAccount.password,
    );

    loginDbg("service:login:password-verified", {
      accountId: existingAccount.id,
      kind: credentials.kind,
      valid: isPasswordValid,
    });

    if (!isPasswordValid) {
      loginDbg("service:login:reject-password-mismatch", {
        accountId: existingAccount.id,
      });
      throw new AppError("Password doesn't match", 400);
    }

    const accessToken = token.generateAccessToken(existingAccount.id);

    const refreshToken = token.generateRefreshToken();

    await UserRepository.updateToken(
      existingAccount.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    loginDbg("service:login:session-issued", {
      accountId: existingAccount.id,
      accountUsername: existingAccount.username,
      loginKind: credentials.kind,
      role: existingAccount.role,
      accessTokenChars: dbgChars(accessToken),
      refreshTokenChars: dbgChars(refreshToken),
    });

    return {
      success: true,
      loginKind: credentials.kind,
      token: accessToken,
      refreshToken,
      data: existingAccount,
    };
  }

  static async loginWithEmail(body: EmailLoginInput) {
    loginDbg("service:login-email:enter", {
      email: body.email,
      username: body.username,
      passwordChars: dbgChars(body.password),
    });

    const existingAccount = await UserRepository.findByEmail(body.email);

    loginDbg("service:login-email:email-lookup", {
      email: body.email,
      found: Boolean(existingAccount),
      accountId: existingAccount?.id ?? null,
    });

    if (existingAccount) {
      const isPasswordValid = await password.verify(
        body.password,
        existingAccount.password,
      );

      loginDbg("service:login-email:existing-account", {
        accountId: existingAccount.id,
        valid: isPasswordValid,
      });

      if (!isPasswordValid) {
        throw new AppError("Password doesn't match", 400);
      }

      return await UserService.issueSession(existingAccount);
    }

    const usernameTaken = await UserRepository.findByUsername({
      username: body.username,
    });

    loginDbg("service:login-email:username-check", {
      username: body.username,
      taken: Boolean(usernameTaken),
    });

    if (usernameTaken) {
      throw new AppError("Username already taken", 409);
    }

    const account = await UserRepository.insertNewUser({
      username: body.username,
      email: body.email,
      password: await password.hash(body.password),
    });

    loginDbg("service:login-email:account-created", {
      accountId: account.id,
      username: account.username,
    });

    return await UserService.issueSession(account);
  }

  private static async issueSession(account: Account) {
    loginDbg("service:issue-session", { accountId: account.id });
    const accessToken = token.generateAccessToken(account.id);

    const refreshToken = token.generateRefreshToken();

    await UserRepository.replaceToken(
      account.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    const { password: hashedPassword, ...data } = account;

    return {
      success: true,
      token: accessToken,
      refreshToken,
      data,
    };
  }

  static async beBuilder(body: BeBuilderInput) {
    const account = await UserRepository.findUserById({
      id: body.accountId,
    });

    if (!account) {
      throw new AppError("User not found", 404);
    }

    if (account.role === "builder") {
      throw new AppError("User is already a builder", 409);
    }

    await UserRepository.upToBuilder(body);

    return {
      success: true,
      message: "account successfully changed to builder account",
    };
  }

  static async getByUsername(query: GetUserByUsernameInput) {
    const account = await UserRepository.findByUsername(query);

    if (!account) {
      throw new AppError("User not found", 404);
    }

    return {
      success: true,
      data: account,
    };
  }

  static async updateProfile(command: UpdateProfileCommand) {
    const account = await UserRepository.findUserById({ id: command.userId });

    if (!account) {
      throw new AppError("User not found", 404);
    }

    const nextUsername = command.username?.trim();
    const nextEmail = command.email?.trim();

    if (nextUsername && nextUsername !== account.username) {
      const taken = await UserRepository.findByUsername({
        username: nextUsername,
      });
      if (taken) {
        throw new AppError("Username already taken", 409);
      }
    }

    if (nextEmail && nextEmail !== account.email) {
      const taken = await UserRepository.findByEmail(nextEmail);
      if (taken) {
        throw new AppError("Email already in use", 409);
      }
    }

    const updated = await UserRepository.updateProfile(account.id, {
      username: nextUsername,
      email: nextEmail,
    });

    if (!updated) {
      throw new AppError("Failed to update profile", 500);
    }

    const { password: _hashedPassword, ...data } = updated;

    return {
      success: true,
      data,
    };
  }
}
