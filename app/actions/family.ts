"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { families, invites, users } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { inviteCode } from "@/lib/crypto";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { appUrl, renderEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { applyToggle, ROLE_LABEL, type Action } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validators";

export async function createInvite(input: unknown): Promise<ActionResult<{ code: string; url: string; emailed: boolean }>> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    const data = inviteSchema.parse(input);
    if (data.memberId) {
      const profile = ctx.members.find((m) => m.id === data.memberId);
      if (!profile) throw new ForbiddenError("That profile isn't in your family.");
      if (profile.userId) throw new ForbiddenError(`${profile.name} already has a login.`);
    }
    const code = inviteCode(6);
    await db.insert(invites).values({
      familyId: ctx.family.id,
      code,
      email: data.email,
      role: data.role,
      memberId: data.memberId,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      createdBy: ctx.user.id,
    });
    const url = appUrl(`/sign-up?invite=${code}`);
    let emailed = false;
    if (data.email) {
      const profile = data.memberId ? ctx.members.find((m) => m.id === data.memberId) : null;
      const { html, text } = renderEmail({
        preheader: `${ctx.user.name} invited you to the ${ctx.family.name} on Pulse`,
        title: `Join the ${ctx.family.name} on Pulse`,
        healthNote: false,
        blocks: [
          { type: "p", text: `${ctx.user.name} invited you to help manage the family's health on Pulse${profile ? `, linked to ${profile.name}'s profile` : ""}.` },
          { type: "list", items: [{ label: "Your role", meta: ROLE_LABEL[data.role] }, { label: "Invite code", meta: code }, { label: "Valid for", meta: "7 days" }] },
          { type: "button", text: "Accept invite", href: url },
          { type: "p", text: "If you weren't expecting this, you can ignore this email." },
        ],
      });
      const res = await sendMail({ to: data.email, subject: `${ctx.user.name} invited you to the ${ctx.family.name} on Pulse`, html, text, kind: "invite" });
      emailed = res.status !== "failed";
    }
    await audit(ctx.family.id, ctx.user.id, "invite.created", { role: data.role, email: data.email, memberId: data.memberId });
    revalidatePath("/settings");
    return { ok: true, message: emailed ? `Invite emailed to ${data.email}` : "Invite code ready to share", data: { code, url, emailed } };
  });
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    await db.delete(invites).where(and(eq(invites.id, id), eq(invites.familyId, ctx.family.id), isNull(invites.usedAt)));
    await audit(ctx.family.id, ctx.user.id, "invite.revoked", {});
    revalidatePath("/settings");
    return { ok: true, message: "Invite cancelled" };
  });
}

const toggleInput = z.object({ role: z.enum(["admin", "caregiver", "member", "viewer"]), action: z.string(), allowed: z.boolean() });

export async function togglePermission(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    const { role, action, allowed } = toggleInput.parse(input);
    let next;
    try {
      next = applyToggle(ctx.family.permissions ?? {}, role, action as Action, allowed);
    } catch {
      throw new ForbiddenError("This permission is locked so nobody gets locked out.");
    }
    await db.update(families).set({ permissions: next }).where(eq(families.id, ctx.family.id));
    await audit(ctx.family.id, ctx.user.id, "permission.changed", { role, action, allowed });
    revalidatePath("/", "layout");
    return { ok: true, message: `${ROLE_LABEL[role]}s ${allowed ? "can now" : "can no longer"}: ${action.replace(".", " ")}` };
  });
}

export async function resetPermissions(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    await db.update(families).set({ permissions: {} }).where(eq(families.id, ctx.family.id));
    await audit(ctx.family.id, ctx.user.id, "permission.reset", {});
    revalidatePath("/", "layout");
    return { ok: true, message: "Permissions reset to the recommended defaults" };
  });
}

const accountInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(20).optional(),
  emailReminders: z.boolean(),
  dailyDigest: z.boolean(),
});

export async function updateAccount(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = accountInput.parse(input);
    await db.update(users).set({ name: data.name, phone: data.phone || null, emailReminders: data.emailReminders, dailyDigest: data.dailyDigest }).where(eq(users.id, ctx.user.id));
    revalidatePath("/", "layout");
    return { ok: true, message: "Account saved" };
  });
}

const passwordInput = z.object({ current: z.string().min(1, "Enter your current password"), next: z.string().min(8, "Use at least 8 characters").max(100) });

export async function changePassword(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = passwordInput.parse(input);
    const [u] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!u || !(await verifyPassword(data.current, u.passwordHash))) return { ok: false, error: "Your current password isn't right.", fieldErrors: { current: "Doesn't match" } };
    await db.update(users).set({ passwordHash: await hashPassword(data.next) }).where(eq(users.id, ctx.user.id));
    await audit(ctx.family.id, ctx.user.id, "account.password_changed", {});
    return { ok: true, message: "Password changed" };
  });
}

export async function sendTestEmail(): Promise<ActionResult<{ status: string; previewUrl: string | null }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const { html, text } = renderEmail({
      preheader: "Email reminders are working",
      title: "Email reminders are working",
      blocks: [
        { type: "status", tone: "success", label: "You're all set", text: "You'll get dose reminders, missed-dose alerts and a morning summary here." },
        { type: "button", text: "Open Pulse", href: appUrl("/dashboard") },
      ],
    });
    const res = await sendMail({ to: ctx.user.email, subject: "Pulse test email", html, text, kind: "test" });
    if (res.status === "failed") return { ok: false, error: "Sending failed. Check the SMTP settings in the server environment." };
    return {
      ok: true,
      message: res.status === "logged" ? "Email rendered and logged (no SMTP configured)" : `Test email sent to ${ctx.user.email}`,
      data: { status: res.status, previewUrl: res.previewUrl ?? null },
    };
  });
}

/** Admin-only demo button: run the reminder sweep and morning summary for this family now. */
export async function runNotificationsNow(): Promise<ActionResult<{ summary: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    const { runDailyDigest, runReminderJob } = await import("@/lib/jobs");
    const [r, d] = await Promise.all([runReminderJob(new Date(), ctx.family.id), runDailyDigest(new Date(), ctx.family.id)]);
    revalidatePath("/", "layout");
    const summary = `${r.dueReminders} dose reminders, ${r.missedAlerts} missed-dose alerts, ${r.refillAlerts} refill alerts, ${r.appointmentReminders} appointment reminders, ${d.sent} morning summaries · ${r.emails + d.sent} emails`;
    return { ok: true, message: "Notification check finished", data: { summary } };
  });
}
