import type {
  RegisterInput,
  LoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
} from "../schemas/auth-schema";
import { UserService } from "@/modules/auth/services/auth-services";
import { AppError } from "@/middlewares/errorHandler";

export class UserController {
  static async registerHandle(body: RegisterInput) {
    try {
      return await UserService.register(body);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to register user", 500, { cause: err });
    }
  }

  static async loginHandle(body: LoginInput) {
    try {
      return await UserService.login(body);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to login user", 500, { cause: err });
    }
  }

  static async beBuilderHandle(body: BeBuilderInput) {
    try {
      return await UserService.beBuilder(body);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to upgrade to builder", 500, { cause: err });
    }
  }

  static async getByUsernameHandle(params: GetUserByUsernameInput) {
    try {
      return await UserService.getByUsername(params);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to get user by username", 500, { cause: err });
    }
  }
}
