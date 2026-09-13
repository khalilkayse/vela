import nodemailer from "nodemailer";
import { BRAND_HEX } from "@/lib/constants";
import { readSettings } from "@/lib/platform-settings";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
};

const KEYS = {
  host: "smtp_host",
  port: "smtp_port",
  user: "smtp_user",
  pass: "smtp_pass",
  fromEmail: "smtp_from_email",
  fromName: "smtp_from_name",
  secure: "smtp_secure",
} as const;

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const raw = await readSettings(Object.values(KEYS));
  const host = (raw[KEYS.host] ?? "").trim();
  const fromEmail = (raw[KEYS.fromEmail] ?? "").trim();
  if (!host || !fromEmail) return null;
  const port = Number.parseInt(raw[KEYS.port] || "587", 10);
  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user: (raw[KEYS.user] ?? "").trim(),
    pass: raw[KEYS.pass] ?? "",
    fromEmail,
    fromName: (raw[KEYS.fromName] ?? "Kart").trim() || "Kart",
    secure: raw[KEYS.secure] === "1" || port === 465,
  };
}

export async function smtpConfigured(): Promise<boolean> {
  return Boolean(await getSmtpConfig());
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const smtp = await getSmtpConfig();
  if (!smtp) {
    console.warn(`[mail] skipped "${input.subject}" to ${input.to} — SMTP is not configured (set it in /dashx).`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  const from = smtp.fromName ? `"${smtp.fromName.replace(/"/g, "")}" <${smtp.fromEmail}>` : smtp.fromEmail;
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? stripHtml(input.html),
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function mailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:${BRAND_HEX.bg};font-family:Georgia,serif;color:${BRAND_HEX.fg};">
  <div style="max-width:560px;margin:32px auto;background:${BRAND_HEX.surface};border:1px solid ${BRAND_HEX.border};border-radius:22px;padding:32px;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND_HEX.primary};">Kart</p>
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </div>
</body></html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
