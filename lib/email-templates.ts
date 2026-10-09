/**
 * Plain, accessible HTML emails with inline styles (email clients ignore CSS files).
 * Colours mirror the app tokens. Every health email carries the safety note.
 */

const C = {
  bg: "#f7f5f0",
  card: "#ffffff",
  ink: "#1d2633",
  muted: "#5b6573",
  border: "#e6e1d8",
  primary: "#2a7570",
  danger: "#b42318",
  dangerBg: "#fdf0ee",
  warning: "#8a5300",
  warningBg: "#fdf6e3",
  success: "#1f7a4d",
  successBg: "#ecf7f0",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "status"; tone: "danger" | "warning" | "success"; label: string; text: string }
  | { type: "list"; title?: string; items: { label: string; meta?: string; tone?: "danger" | "warning" | "success" }[] }
  | { type: "button"; text: string; href: string };

const TONE_ICON = { danger: "▲", warning: "●", success: "✓" } as const;

export function renderEmail(opts: { preheader: string; title: string; blocks: EmailBlock[]; footer?: string; healthNote?: boolean }) {
  const body = opts.blocks
    .map((b) => {
      switch (b.type) {
        case "p":
          return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink}">${esc(b.text)}</p>`;
        case "status": {
          const fg = b.tone === "danger" ? C.danger : b.tone === "warning" ? C.warning : C.success;
          const bg = b.tone === "danger" ? C.dangerBg : b.tone === "warning" ? C.warningBg : C.successBg;
          return `<div style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:${bg};color:${fg};font-size:16px;line-height:1.5"><strong>${TONE_ICON[b.tone]} ${esc(b.label)}</strong><br/><span style="color:${C.ink}">${esc(b.text)}</span></div>`;
        }
        case "list":
          return `${b.title ? `<p style="margin:20px 0 8px;font-size:14px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.04em">${esc(b.title)}</p>` : ""}<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 12px">${b.items
            .map((i) => {
              const fg = i.tone === "danger" ? C.danger : i.tone === "warning" ? C.warning : i.tone === "success" ? C.success : C.ink;
              return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:16px;color:${fg}">${i.tone ? `${TONE_ICON[i.tone]} ` : ""}${esc(i.label)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.muted};text-align:right;white-space:nowrap">${esc(i.meta ?? "")}</td></tr>`;
            })
            .join("")}</table>`;
        case "button":
          return `<p style="margin:24px 0"><a href="${esc(b.href)}" style="display:inline-block;background:${C.primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:10px">${esc(b.text)}</a></p>`;
      }
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" style="background:${C.bg};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px">
<tr><td style="padding:0 4px 16px"><span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${C.primary};vertical-align:middle"></span><span style="font-size:18px;font-weight:700;color:${C.ink};vertical-align:middle;margin-left:10px">Pulse</span><span style="font-size:14px;color:${C.muted};vertical-align:middle;margin-left:6px">Family health</span></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.ink}">${esc(opts.title)}</h1>
${body}
${opts.healthNote !== false ? `<p style="margin:20px 0 0;font-size:14px;color:${C.muted}">ⓘ Not a diagnosis. Consult a doctor.</p>` : ""}
</td></tr>
<tr><td style="padding:16px 4px;font-size:13px;line-height:1.5;color:${C.muted}">${esc(opts.footer ?? "You get these emails because you're part of a family on Pulse. Turn them off any time in Account settings.")}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    opts.title,
    "",
    ...opts.blocks.map((b) => {
      switch (b.type) {
        case "p":
          return b.text;
        case "status":
          return `${b.label}: ${b.text}`;
        case "list":
          return `${b.title ? `${b.title}\n` : ""}${b.items.map((i) => `- ${i.label}${i.meta ? ` (${i.meta})` : ""}`).join("\n")}`;
        case "button":
          return `${b.text}: ${b.href}`;
      }
    }),
    "",
    opts.healthNote !== false ? "Not a diagnosis. Consult a doctor." : "",
  ].join("\n");

  return { html, text };
}

export function appUrl(path = "/"): string {
  const base = (process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const withProto = base.startsWith("http") ? base : `https://${base}`;
  return `${withProto}${path}`;
}
