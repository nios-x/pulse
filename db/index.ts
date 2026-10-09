import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pulseSql?: postgres.Sql };

// On Vercel every function instance opens its own pool, so keep it small and let idle
// connections close. Prepared statements are off because pooled URLs (Neon "-pooler",
// Supabase port 6543) run PgBouncer in transaction mode, which doesn't support them.
const serverless = Boolean(process.env.VERCEL);

export const sql =
  globalForDb.pulseSql ??
  postgres(process.env.DATABASE_URL!, serverless ? { max: 3, idle_timeout: 20, prepare: false } : { max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.pulseSql = sql;

export const db = drizzle(sql, { schema });
