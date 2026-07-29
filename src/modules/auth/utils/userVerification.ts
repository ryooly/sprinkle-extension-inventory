import { UserRepository } from "@/modules/auth/repository/auth-repository";

export async function isUserAvailable(
  username: string,
  email: string,
): Promise<boolean> {
  const user = await UserRepository.findByUsernameOrEmail(username, email)

  return !user;
}
