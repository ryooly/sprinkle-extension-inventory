import { UserRepository } from "@/modules/auth/repository/auth-repository";
import { password } from "../utils/bcrypt";
import { isUserAvailable } from "@/modules/auth/utils/userVerification";
import { token } from "@/modules/auth/utils/generateJwt";
import {
  RegisterInput,
  LoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
} from "@/modules/auth/schemas/auth-schema";
import { AppError } from "@/middlewares/errorHandler";

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

    const refreshToken = token.generateRefreshToken(account.id);

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

    const refreshToken = token.generateRefreshToken(existingAccount.id);

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

    const updated = await UserRepository.upToBuilder(body);

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
