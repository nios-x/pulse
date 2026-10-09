import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ quiet: true });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Migrations need a direct connection; the Neon integration on Vercel sets DATABASE_URL_UNPOOLED.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
