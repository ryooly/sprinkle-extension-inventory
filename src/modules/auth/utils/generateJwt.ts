import jwt from "jsonwebtoken";
import { config } from "config";

export const token = {
  generateAccessToken(userId: string) {
    return jwt.sign({ userId }, config.jwtSecret, {
      expiresIn: "15m",
    });
  },

  generateRefreshToken(userId: string) {
    return jwt.sign({ userId }, config.jwtSecret, {
      expiresIn: "7d",
    });
  },
};
