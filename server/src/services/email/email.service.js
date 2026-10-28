import { config } from "../../config/env.js";
import { serviceDb } from "../../config/supabase.js";
import { mailTransport, mailMode, fromAddress } from "../../config/mailer.js";
import { EmailLogModel } from "../../models/email.model.js";
import { templates } from "./templates.js";

// ---------------------------------------------------------------------------
// In-process send queue: emails never block an API response, transient SMTP
// failures retry with backoff, and bulk sends are throttled. (In-memory: a
// server restart drops unsent jobs — use a persistent queue such as BullMQ if
// volume grows.)
// ---------------------------------------------------------------------------
const CONCURRENCY = 3;
const RETRY_DELAYS_MS = [2000, 8000];
const queue = [];
let active = 0;

const pump = () => {
  while (active < CONCURRENCY && queue.length > 0) {
    const job = queue.shift();
    active += 1;
    job()
      .catch(() => {})
      .finally(() => {
        active -= 1;
        pump();
      });
  }
};

const enqueue = (job) =>
  new Promise((resolve) => {
    queue.push(() => job().then(resolve, (err) => resolve({ ok: false, error: err?.message })));
    pump();
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Network hiccups and SMTP 4xx "try again later" replies are worth retrying;
// 5xx replies (bad address, auth failure, rejected content) are permanent.
const TRANSIENT_CODES = ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET", "EDNS"];
const TRANSIENT_SMTP = [421, 450, 451, 452, 454];
const isTransient = (error) => TRANSIENT_CODES.includes(error?.code) || TRANSIENT_SMTP.includes(error?.responseCode);

/** Renders and delivers one email right now (with retries). Used by the queue. */
const deliver = async ({ to, template, data = {}, broadcastId = null, headers = {} }) => {
  const render = templates[template];
  if (!render) throw new Error(`Unknown email template: ${template}`);
  const { subject, html, text } = render(data);

  if (mailMode === "disabled") {
    await EmailLogModel.insert(serviceDb, { to_email: to, template, subject, status: "SKIPPED", error: "SMTP not configured", broadcast_id: broadcastId });
    return { ok: false, skipped: true };
  }

  const message = {
    from: fromAddress,
    to,
    subject,
    html,
    text,
    headers,
    ...(config.email.replyTo ? { replyTo: config.email.replyTo } : {}),
  };

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const info = await mailTransport.sendMail(message);
      if (mailMode === "log") {
        console.log(`\n[email:log] To: ${to}\n[email:log] Subject: ${subject}\n${text}\n`);
      }
      await EmailLogModel.insert(serviceDb, {
        to_email: to,
        template,
        subject,
        status: "SENT",
        message_id: info.messageId || null,
        broadcast_id: broadcastId,
      });
      return { ok: true, messageId: info.messageId };
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length && isTransient(error)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      break;
    }
  }

  console.warn(`[email] Failed to send "${template}" to ${to}: ${lastError?.message}`);
  await EmailLogModel.insert(serviceDb, {
    to_email: to,
    template,
    subject,
    status: "FAILED",
    error: String(lastError?.message || "Unknown error").slice(0, 500),
    broadcast_id: broadcastId,
  });
  return { ok: false, error: lastError?.message };
};

// ---------------------------------------------------------------------------
// Preference lookup for transactional emails sent to a user id
// ---------------------------------------------------------------------------
const TEACHER_PREF_COLUMNS =
  "job_alerts_enabled, application_updates_enabled, interview_notifications_enabled, employer_interest_enabled, marketing_emails_enabled";

const loadRecipient = async (userId) => {
  const { data: profile } = await serviceDb.from("profiles").select("id, name, email, role").eq("id", userId).maybeSingle();
  if (!profile?.email) return null;
  const role = String(profile.role || "").toLowerCase();
  let prefs = {};
  if (role === "teacher") {
    const { data } = await serviceDb.from("teachers").select(TEACHER_PREF_COLUMNS).eq("id", userId).maybeSingle();
    prefs = data || {};
  } else if (role === "institute") {
    const { data } = await serviceDb
      .from("institutes")
      .select("institute_name, email_notifications_enabled, marketing_emails_enabled")
      .eq("id", userId)
      .maybeSingle();
    prefs = data || {};
    if (data?.institute_name) profile.name = data.institute_name;
  }
  return { ...profile, role, prefs };
};

export const EmailService = {
  mode: mailMode,

  /** Queues an email to an address. Resolves with the delivery result (callers usually don't await). */
  send(to, template, data = {}, options = {}) {
    if (!to) return Promise.resolve({ ok: false, error: "No recipient" });
    return enqueue(() => deliver({ to, template, data, ...options }));
  },

  /** Sends immediately (still with retries) — for OTP codes the user is waiting on. */
  sendNow(to, template, data = {}, options = {}) {
    return deliver({ to, template, data, ...options });
  },

  /**
   * Queues an email to a user by id, honouring their preferences.
   * `preference` names a teacher column (e.g. "job_alerts_enabled"); institutes
   * use email_notifications_enabled. Security emails pass `preference: null`.
   */
  async sendToUser(userId, template, data = {}, { preference } = {}) {
    try {
      const recipient = await loadRecipient(userId);
      if (!recipient) return { ok: false, error: "Recipient has no email" };
      if (preference) {
        const flag = recipient.role === "institute" ? recipient.prefs.email_notifications_enabled : recipient.prefs[preference];
        if (flag === false) return { ok: false, skipped: true };
      }
      return this.send(recipient.email, template, { name: recipient.name, role: recipient.role, ...data });
    } catch (error) {
      console.warn(`[email] Could not queue "${template}" for user ${userId}: ${error.message}`);
      return { ok: false, error: error.message };
    }
  },

  /** Fire-and-forget wrapper so a failed email never fails the API request. */
  background(promise) {
    Promise.resolve(promise).catch((error) => console.warn("[email] background send failed:", error?.message));
  },

  queueSize: () => queue.length + active,
};
