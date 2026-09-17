import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET as string,
  secretKey: process.env.SECRET_KEY!,
  port: process.env.PORT,
  apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:3000",
  
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
};
