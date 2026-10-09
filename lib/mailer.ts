import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/db";
import { emailLog } from "@/db/schema";

/**
 * Email delivery with nodemailer.
 * - SMTP_URL (e.g. smtps://user:pass@smtp.gmail.com:465) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS: real email.
 * - MAIL_TRANSPORT=ethereal: a free Ethereal test inbox; each email gets a preview URL (needs internet).
 * - Otherwise: emails are rendered and logged (email_log table + server console), never sent.
 */

type Mode = "smtp" | "ethereal" | "log";

let transporter: Promise<{ t: Transporter; mode: Mode }> | null = null;

function mode(): Mode {
  if (process.env.SMTP_URL || process.env.SMTP_HOST) return "smtp";
  if (process.env.MAIL_TRANSPORT === "ethereal") return "ethereal";
  return "log";
}

async function getTransporter(): Promise<{ t: Transporter; mode: Mode }> {
  transporter ??= (async () => {
    const m = mode();
    if (m === "smtp") {
      const t = process.env.SMTP_URL
        ? nodemailer.createTransport(process.env.SMTP_URL)
        : nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: Number(process.env.SMTP_PORT ?? 587) === 465,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
      return { t, mode: m };
    }
    if (m === "ethereal") {
      const account = await nodemailer.createTestAccount();
      const t = nodemailer.createTransport({ host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure, auth: { user: account.user, pass: account.pass } });
      return { t, mode: m };
    }
    return { t: nodemailer.createTransport({ jsonTransport: true }), mode: m };
  })();
  return transporter;
}

export function mailMode(): Mode {
  return mode();
}

export type Mail = { to: string; subject: string; html: string; text: string; kind: string };

export async function sendMail(mail: Mail): Promise<{ status: "sent" | "logged" | "failed"; previewUrl?: string | null }> {
  const from = process.env.MAIL_FROM ?? "Pulse Family Health <no-reply@pulse.health>";
  try {
    const { t, mode: m } = await getTransporter();
    const info = await t.sendMail({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
    const previewUrl = m === "ethereal" ? nodemailer.getTestMessageUrl(info) || null : null;
    const status = m === "log" ? "logged" : "sent";
    if (m === "log") console.info(`[mail:logged] to=${mail.to} subject="${mail.subject}"`);
    if (previewUrl) console.info(`[mail:ethereal] ${previewUrl}`);
    await db.insert(emailLog).values({ to: mail.to, subject: mail.subject, kind: mail.kind, status, messageId: info.messageId ?? null, previewUrl });
    return { status, previewUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mail:failed]", message);
    await db.insert(emailLog).values({ to: mail.to, subject: mail.subject, kind: mail.kind, status: "failed", error: message.slice(0, 500) });
    return { status: "failed" };
  }
}
