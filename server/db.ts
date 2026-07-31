import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Standard node-postgres driver. Works against any Postgres server
// (Dokploy-managed Postgres, self-hosted, RDS, etc). If DATABASE_URL
// points to a provider that requires TLS with a self-signed cert
// (some managed providers), set PGSSL=true to enable it.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });