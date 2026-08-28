import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not defined");
}

const runMigration = async () => {
  const pool = new Pool({
    connectionString: url,
  });

  console.log("Running migrations...");

  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  await pool.end();

  console.log("Migration completed");
};

runMigration().catch(console.error);