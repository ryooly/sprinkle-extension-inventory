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
    return await UserService.beBuilder(body);
  }

  static async getByUsernameHandle(params: GetUserByUsernameInput) {
    return await UserService.getByUsername(params);
  }
}
