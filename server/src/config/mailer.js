import nodemailer from "nodemailer";
import { config, isEmailConfigured } from "./env.js";

/**
 * Nodemailer transport.
 * - SMTP configured  → SMTP with automatic port fallback (Gmail, Zoho, SES, Brevo, Mailgun...).
 * - Not configured   → "log" transport: in development each email is printed to
 *   the server console (so OTP codes can still be tested); in production emails
 *   are skipped and recorded as SKIPPED.
 *
 * Why port fallback: some hosts block outbound SMTP. Render's FREE plan blocks
 * ports 25, 465 and 587 (since Sept 2025), so a connection there simply hangs
 * until it times out. Port 2525 is NOT blocked, and most transactional
 * providers (Brevo, Mailgun, SendGrid, SES, Postmark, SMTP2GO) accept it.
 * We try the configured port first, then SMTP_FALLBACK_PORTS, and remember
 * whichever port connects so later emails go straight to it.
 */

// Errors that mean "couldn't reach the server on this port", so trying another port can help.
const CONNECT_ERROR_CODES = new Set(["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "EHOSTUNREACH", "EDNS"]);
const isConnectError = (error) =>
  CONNECT_ERROR_CODES.has(error?.code) || /timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(error?.message || "");

const parsePorts = (value) =>
  String(value || "")
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((p) => Number.isInteger(p) && p > 0);

const candidatePorts = () => {
  const ports = [config.email.port, ...parsePorts(process.env.SMTP_FALLBACK_PORTS ?? "465,587,2525")];
  return [...new Set(ports)];
};

const buildTransport = (port) => {
  // Port 465 = implicit TLS. Any other port uses STARTTLS. An explicit
  // SMTP_SECURE only applies to the primary port.
  const secure = port === config.email.port ? config.email.secure : port === 465;
  return nodemailer.createTransport({
    host: config.email.host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: config.email.user, pass: config.email.pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    // Gmail and most providers allow ~10/s; stay comfortably below.
    rateDelta: 1000,
    rateLimit: 5,
    // Fail fast instead of hanging ~2 minutes on a blocked port.
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    dnsTimeout: 10000,
    tls: { servername: config.email.host, minVersion: "TLSv1.2" },
  });
};

const createSmtpTransport = () => {
  const ports = candidatePorts();
  const transports = new Map(); // port -> transporter (built lazily)
  let preferredIndex = 0;

  const get = (port) => {
    if (!transports.has(port)) transports.set(port, buildTransport(port));
    return transports.get(port);
  };

  // Try the last-good port first, then the rest in order.
  const orderedPorts = () => [ports[preferredIndex], ...ports.filter((_, i) => i !== preferredIndex)];

  const withFallback = async (action) => {
    const failures = [];
    for (const port of orderedPorts()) {
      try {
        const result = await action(get(port));
        const idx = ports.indexOf(port);
        if (idx !== preferredIndex) {
          console.log(`[email] SMTP reachable on port ${port}; using it from now on.`);
          preferredIndex = idx;
        }
        return result;
      } catch (error) {
        if (!isConnectError(error)) throw error; // auth / recipient / content error: another port won't fix it
        failures.push(`${port}: ${error.code || error.message}`);
        // Drop the broken pooled connection so a later retry starts fresh.
        transports.get(port)?.close();
        transports.delete(port);
      }
    }
    const error = new Error(
      `Could not connect to ${config.email.host} on any port (${failures.join("; ")}). ` +
        "The host is probably blocking outbound SMTP. On Render's free plan, ports 25/465/587 are blocked: " +
        "use a provider that supports port 2525 (e.g. Brevo smtp-relay.brevo.com:2525) or upgrade the Render instance."
    );
    error.code = "EALLPORTSFAILED"; // not retried by email.service: every port was already tried
    throw error;
  };

  return {
    sendMail: (message) => withFallback((t) => t.sendMail(message)),
    verify: () => withFallback((t) => t.verify()),
    close: () => transports.forEach((t) => t.close()),
    ports,
  };
};

export const mailTransport = isEmailConfigured() ? createSmtpTransport() : nodemailer.createTransport({ jsonTransport: true });

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
