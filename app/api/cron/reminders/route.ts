import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { runReminderJob } from "@/lib/reminder-job";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Run every 15 minutes by Vercel Cron or any scheduler, with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  await connection();
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminderJob(new Date());
  return Response.json(result);
}
