/**
 * Optional in-process scheduler for self-hosting and local demos (LOCAL_CRON=1).
 * On Vercel, use vercel.json crons instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.LOCAL_CRON !== "1") return;
  const g = globalThis as unknown as { pulseCron?: boolean };
  if (g.pulseCron) return;
  g.pulseCron = true;
  const { runReminderJob, runDailyDigest } = await import("./lib/jobs");
  const tick = async () => {
    try {
      const r = await runReminderJob();
      if (r.dueReminders || r.missedAlerts || r.refillAlerts || r.appointmentReminders) console.info("[cron] reminders", r);
      // 7:00–7:14 am India time → morning summary (deduped per person per day)
      const ist = new Date(Date.now() + 330 * 60_000);
      if (ist.getUTCHours() === 7 && ist.getUTCMinutes() < 15) console.info("[cron] digest", await runDailyDigest());
    } catch (err) {
      console.error("[cron] failed", err);
    }
  };
  setTimeout(tick, 10_000);
  setInterval(tick, 5 * 60_000);
  console.info("[cron] local scheduler on: reminders every 5 minutes");
}
