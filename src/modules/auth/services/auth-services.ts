import { UserRepository } from "@/modules/auth/repository/auth-repository";
import { password } from "../utils/bcrypt";
import { isUserAvailable } from "@/modules/auth/utils/userVerification";
import { token } from "@/modules/auth/utils/generateJwt";
import {
  RegisterInput,
  LoginInput,
  EmailLoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
} from "@/schemas/auth";
import { AppError } from "@/errorhandler";
import type { Account } from "@/models";

export class UserService {
  static async register(body: RegisterInput) {
    const isAvailable = await isUserAvailable(body.username, body.email);

    if (!isAvailable) {
      throw new AppError("User already exists", 409);
    }

    const hashedPassword = await password.hash(body.password);

    const account = await UserRepository.insertNewUser({
      ...body,
      password: hashedPassword,
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
    const existingAccount = await UserRepository.login(body);

    if (!existingAccount) {
      throw new AppError("User not found", 409);
    }

    const isPasswordValid = await password.verify(
      body.password,
      existingAccount.password,
    );

    if (!isPasswordValid) {
      throw new AppError("Password doesn't match", 400);
    }

    const accessToken = token.generateAccessToken(existingAccount.id);

    const refreshToken = token.generateRefreshToken();

    await UserRepository.updateToken(
      existingAccount.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      success: true,
      token: accessToken,
      refreshToken,
      data: existingAccount,
    };
  }

  static async loginWithEmail(body: EmailLoginInput) {
    const existingAccount = await UserRepository.login({
      email: body.email,
      password: body.password,
    });

    if (existingAccount) {
      const isPasswordValid = await password.verify(
        body.password,
        existingAccount.password,
      );

      if (!isPasswordValid) {
        throw new AppError("Password doesn't match", 400);
      }

      return await UserService.issueSession(existingAccount);
    }

    const usernameTaken = await UserRepository.findByUsername({
      username: body.username,
    });

    if (usernameTaken) {
      throw new AppError("Username already taken", 409);
    }

    const account = await UserRepository.insertNewUser({
      username: body.username,
      email: body.email,
      password: await password.hash(body.password),
    });

    return await UserService.issueSession(account);
  }

  private static async issueSession(account: Account) {
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
}
