import type {
  RegisterInput,
  LoginInput,
  EmailLoginInput,
  BeBuilderInput,
  GetUserByUsernameInput,
  UpdateProfileInput,
} from "@/schemas/auth";
import { UserService } from "@/modules/auth/services/auth-services";
import { loginDbg } from "@/modules/auth/utils/loginDebug";
import { AppError } from "@/errorhandler";

function describeError(err: unknown) {
  const name =
    err instanceof AppError
      ? "AppError"
      : err instanceof Error
        ? err.name
        : typeof err;

  return {
    name,
    status: err instanceof AppError ? err.status : null,
    message: err instanceof Error ? err.message : String(err),
  };
}

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
      const result = await UserService.login(body);

      loginDbg("controller:login:ok", {
        loginKind: result.loginKind,
        accountId: result.data.id,
      });

      return result;
    } catch (err) {
      loginDbg("controller:login:error", describeError(err));
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to login user", 500, { cause: err });
    }
  }

  static async loginWithEmailHandle(body: EmailLoginInput) {
    try {
      const result = await UserService.loginWithEmail(body);

      loginDbg("controller:login-email:ok", { accountId: result.data.id });

      return result;
    } catch (err) {
      loginDbg("controller:login-email:error", describeError(err));
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to login user with email", 500, {
        cause: err,
      });
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

  static async updateProfileHandle(userId: string, body: UpdateProfileInput) {
    try {
      return await UserService.updateProfile({ userId, ...body });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to update profile", 500, { cause: err });
    }
  }
}
