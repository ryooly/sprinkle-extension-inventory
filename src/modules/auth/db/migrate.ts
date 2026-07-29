import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

const url = process.env.DATABASE_URL;
console.log("DATABASE_URL:", url);

const runMigration = async () => {
  const pool = new Pool({
    connectionString: url,
  });

  console.log("Connecting...");
  const client = await pool.connect();
  console.log("Connected!");
  client.release();

  const db = drizzle(pool);

  console.log("Running migrations...");

  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  await pool.end();

  console.log("Migration completed");
};

runMigration().catch(console.error);