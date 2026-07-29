import { defineConfig } from "drizzle-kit";
import { config } from "./config";

export default defineConfig({
  schema: "./src/modules/auth/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.dbUrl!,
  },
});



