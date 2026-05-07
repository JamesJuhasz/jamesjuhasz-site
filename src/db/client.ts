import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reuse the pool across hot reloads in dev to avoid pool exhaustion.
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision Postgres on Railway and set DATABASE_URL.",
    );
  }
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: url,
      // Railway proxies use TLS but skip cert verification for the proxy host.
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return global.__pgPool;
}

let cached: NodePgDatabase<typeof schema> | null = null;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!cached) {
    cached = drizzle(getPool(), { schema });
  }
  return cached;
}

export { schema };
