import { cronAuthorized } from "@/lib/cron-auth";
import { runDailyDigest, runReminderJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Morning summary email (7 am India time). Also runs the reminder sweep, for plans with daily crons only. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [digest, reminders] = await Promise.all([runDailyDigest(), runReminderJob()]);
  return Response.json({ ok: true, ranAt: new Date().toISOString(), digest, reminders });
}
