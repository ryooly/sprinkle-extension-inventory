import type { LoginCredentials, LoginInput } from "@/schemas/auth";
import { loginDbg } from "@/modules/auth/utils/loginDebug";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function resolveLoginCredentials(
  body: LoginInput,
): LoginCredentials | null {
  const explicitEmail = body.email?.trim();
  if (explicitEmail) {
    loginDbg("resolve:email-field-wins", { value: explicitEmail });
    return { value: explicitEmail, kind: "email" };
  }

  const explicitUsername = body.username?.trim();
  if (explicitUsername) {
    loginDbg("resolve:username-field-wins", { value: explicitUsername });
    return { value: explicitUsername, kind: "username" };
  }

  const identifier = body.identifier?.trim();
  if (!identifier) {
    loginDbg("resolve:no-credential-found", { identifier: body.identifier });
    return null;
  }

  const kind = isEmailAddress(identifier) ? "email" : "username";
  loginDbg("resolve:identifier-detected", {
    identifier: body.identifier,
    trimmed: identifier,
    trimmedLength: identifier.length,
    emailShaped: kind === "email",
    kind,
  });

  return { value: identifier, kind };
}
