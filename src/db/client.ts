import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reuse the pool across hot reloads in dev to avoid pool exhaustion.
  var __pgPool: Pool | undefined;
}

function needsSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  // Railway's internal network (postgres.railway.internal:5432) doesn't
  // require SSL — connecting with SSL fails the handshake. Local Postgres
  // also doesn't use SSL. Public proxy hostnames (e.g. proxy.rlwy.net)
  // require SSL but with self-signed certs we don't verify.
  if (url.includes("localhost")) return false;
  if (url.includes(".railway.internal")) return false;
  return { rejectUnauthorized: false };
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
      ssl: needsSsl(url),
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
