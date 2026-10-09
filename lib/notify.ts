import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { members, notifications, users, type Severity } from "@/db/schema";
import { appUrl, renderEmail, type EmailBlock } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";

export type NotifyInput = {
  familyId: string;
  memberId?: string | null;
  kind: string;
  severity: Severity;
  title: string;
  body: string;
  href?: string | null;
  /** Same key → stored and emailed only once. */
  dedupeKey?: string | null;
  email?: { subject?: string; blocks?: EmailBlock[]; recipients?: "care-team" | "member" | "none" };
};

/** People who should hear about a member: admins, caregivers assigned to them, and the member if they have a login. */
export async function careTeamEmails(familyId: string, memberId?: string | null, opts: { kind: "reminder" | "digest" } = { kind: "reminder" }) {
  const rows = await db
    .select({ role: members.role, memberId: members.id, assigned: members.assignedMemberIds, email: users.email, name: users.name, emailReminders: users.emailReminders, dailyDigest: users.dailyDigest })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.familyId, familyId), isNotNull(members.userId)));
  return rows
    .filter((r) => (opts.kind === "digest" ? r.dailyDigest : r.emailReminders))
    .filter((r) => !memberId || r.role === "admin" || (r.role === "caregiver" && r.assigned.includes(memberId)) || r.memberId === memberId)
    .map((r) => ({ email: r.email, name: r.name, role: r.role }));
}

export async function notify(input: NotifyInput): Promise<{ created: boolean; emailed: number }> {
  const [row] = await db
    .insert(notifications)
    .values({
      familyId: input.familyId,
      memberId: input.memberId ?? null,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning({ id: notifications.id });
  if (!row) return { created: false, emailed: 0 };

  const who = input.email?.recipients ?? "care-team";
  if (who === "none") return { created: true, emailed: 0 };
  let recipients = await careTeamEmails(input.familyId, input.memberId);
  if (who === "member" && input.memberId) {
    const [m] = await db.select({ userId: members.userId }).from(members).where(eq(members.id, input.memberId));
    if (m?.userId) {
      const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, m.userId));
      recipients = recipients.filter((r) => r.email === u?.email);
    }
  }
  const blocks: EmailBlock[] = input.email?.blocks ?? [
    { type: "status", tone: input.severity === "urgent" ? "danger" : input.severity === "warning" ? "warning" : "success", label: input.title, text: input.body },
    ...(input.href ? [{ type: "button" as const, text: "Open in Pulse", href: appUrl(input.href) }] : []),
  ];
  const { html, text } = renderEmail({ preheader: input.body, title: input.title, blocks });
  let emailed = 0;
  for (const r of recipients) {
    const res = await sendMail({ to: r.email, subject: input.email?.subject ?? input.title, html, text, kind: input.kind });
    if (res.status !== "failed") emailed++;
  }
  if (emailed) await db.update(notifications).set({ emailedAt: new Date() }).where(inArray(notifications.id, [row.id]));
  return { created: true, emailed };
}
