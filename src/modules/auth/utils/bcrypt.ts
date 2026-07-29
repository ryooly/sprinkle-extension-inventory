import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const password = {
  hash: async (plainPassword: string): Promise<string> => {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  },

  verify: async (
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> => {
    return bcrypt.compare(plainPassword, hashedPassword);
  },
};