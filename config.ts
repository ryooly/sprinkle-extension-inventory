import dotenv from 'dotenv';

dotenv.config();

export const config = {
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET as string,
  secretKey: process.env.SECRET_KEY!,
  port: process.env.PORT,
};
