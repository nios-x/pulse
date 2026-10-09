import { execSync } from "node:child_process";

/** Resets the database to the demo family before the run. */
export default async function globalSetup() {
  execSync("bunx tsx --env-file=.env db/seed.ts", { stdio: "inherit" });
}
