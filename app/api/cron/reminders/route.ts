import { cronAuthorized } from "@/lib/cron-auth";
import { runReminderJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Dose-time reminders, missed-dose alerts, refills and next-day appointments. Every 15 minutes. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const report = await runReminderJob();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...report });
}
