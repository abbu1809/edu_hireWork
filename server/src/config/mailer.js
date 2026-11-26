import nodemailer from "nodemailer";
import { config, isEmailConfigured } from "./env.js";

/**
 * Nodemailer transport.
 * - SMTP configured  → pooled SMTP connection (Gmail, Zoho, SES, Brevo, Mailgun...).
 * - Not configured   → "log" transport: in development each email is printed to
 *   the server console (so OTP codes can still be tested); in production emails
 *   are skipped and recorded as SKIPPED.
 */
export const mailTransport = isEmailConfigured()
  ? nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: { user: config.email.user, pass: config.email.pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // Gmail and most providers allow ~10/s; stay comfortably below.
      rateDelta: 1000,
      rateLimit: 5,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const mailMode = isEmailConfigured() ? "smtp" : config.nodeEnv === "production" ? "disabled" : "log";

export const fromAddress = `"${config.email.fromName.replace(/"/g, "")}" <${config.email.fromEmail}>`;

/** Checks the SMTP login at start-up so misconfiguration shows up immediately. */
export const verifyMailTransport = async () => {
  if (mailMode !== "smtp") return { ok: false, mode: mailMode };
  try {
    await mailTransport.verify();
    return { ok: true, mode: mailMode };
  } catch (error) {
    return { ok: false, mode: mailMode, error: error.message };
  }
};
