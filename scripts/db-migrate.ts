/*
  Apply pending Drizzle migrations against DATABASE_URL.
  Run with: npm run db:migrate
*/
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);
  console.log("[db:migrate] applying migrations…");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("[db:migrate] done");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
