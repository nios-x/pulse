import { connection } from "next/server";

/**
 * The current time for Server Components. With Cache Components a bare
 * `new Date()` during render is an error; connection() marks the render as
 * request-time first.
 */
export async function now(): Promise<Date> {
  await connection();
  return new Date();
}
