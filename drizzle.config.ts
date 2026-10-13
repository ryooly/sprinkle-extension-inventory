import { defineConfig } from "drizzle-kit";
import { config } from "./config";

export default defineConfig({
  schema: "./src/models/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.dbUrl!,
  },
});
