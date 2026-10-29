import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";
import { config } from "../../config";
import { logger } from "@/logger";

const url = config.dbUrl;

if (!url) {
  throw new Error("DATABASE_URL is not defined");
}

const runMigration = async () => {
  const pool = new Pool({
    connectionString: url,
  });

  logger.info("Running migrations...");

  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  await pool.end();

  logger.info("Migration completed");
};

runMigration().catch((err) => logger.error(String(err)));
