import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pulseSql?: postgres.Sql };

export const sql = globalForDb.pulseSql ?? postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.pulseSql = sql;

export const db = drizzle(sql, { schema });
