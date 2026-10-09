import { timingSafeEqual } from "node:crypto";

/** Vercel Cron sends "Authorization: Bearer $CRON_SECRET". Other schedulers can do the same. */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
