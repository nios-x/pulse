/**
 * Applies db/migrations. Run: bun run db:migrate (Vercel runs it before every build).
 * Used instead of `drizzle-kit migrate`, whose spinner hides the Postgres error when a migration fails.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ quiet: true });

// Migrations need a direct connection; the Neon integration on Vercel sets DATABASE_URL_UNPOOLED.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("db:migrate: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

migrate(drizzle(sql), { migrationsFolder: "./db/migrations" })
  .then(() => console.log("Migrations applied"))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
