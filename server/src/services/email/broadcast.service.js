import { serviceDb } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { isValidEmail } from "../../utils/normalize.js";
import { EmailBroadcastModel } from "../../models/email.model.js";
import { EmailService } from "./email.service.js";
import { appUrl } from "./templates.js";
import { unsubscribeUrlFor } from "./subscriber.service.js";

export const EMAIL_AUDIENCES = ["ALL", "TEACHER", "INSTITUTE", "SUBSCRIBERS", "SELECTED"];
const MAX_SELECTED = 1000;

/** Reads every row of a query in pages (PostgREST caps responses at 1000 rows). */
const fetchAll = async (build, pageSize = 1000) => {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw ApiError.badRequest(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
};

/** Ids of members who turned marketing emails off (selected-user sends ignore this). */
const optedOutIds = async () => {
  const [teachers, institutes] = await Promise.all([
    fetchAll(() => serviceDb.from("teachers").select("id").eq("marketing_emails_enabled", false)),
    fetchAll(() => serviceDb.from("institutes").select("id").eq("marketing_emails_enabled", false)),
  ]);
  return new Set([...teachers, ...institutes].map((r) => r.id));
};

const preferencesPath = (role) => (role === "INSTITUTE" ? "/institute/profile" : role === "TEACHER" ? "/teacher/settings" : "/");

/** Resolves an audience to a de-duplicated list of { email, name, unsubscribeUrl?, preferencesUrl? }. */
const resolveRecipients = async ({ audience, userIds = [] }) => {
  if (audience === "SUBSCRIBERS") {
    const subs = await fetchAll(() => serviceDb.from("newsletter_subscribers").select("email, name, unsubscribe_token").eq("status", "SUBSCRIBED"));
    return subs.map((s) => ({ email: s.email, name: s.name, unsubscribeUrl: unsubscribeUrlFor(s.unsubscribe_token) }));
  }

  let profiles;
  if (audience === "SELECTED") {
    const ids = [...new Set(userIds)].slice(0, MAX_SELECTED);
    if (ids.length === 0) throw ApiError.badRequest("Please select at least one recipient.");
    profiles = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await serviceDb.from("profiles").select("id, name, email, role").in("id", ids.slice(i, i + 200));
      if (error) throw ApiError.badRequest(error.message);
      profiles.push(...(data || []));
    }
  } else {
    const roles = audience === "ALL" ? ["TEACHER", "INSTITUTE"] : [audience];
    profiles = await fetchAll(() => serviceDb.from("profiles").select("id, name, email, role").in("role", roles));
    const optedOut = await optedOutIds();
    profiles = profiles.filter((p) => !optedOut.has(p.id));
  }

  return profiles
    .filter((p) => p.email)
    .map((p) => ({ email: p.email, name: p.name, preferencesUrl: appUrl(preferencesPath(p.role)) }));
};

const dedupe = (list) => {
  const seen = new Set();
  return list.filter((r) => {
    const key = String(r.email).trim().toLowerCase();
    if (!isValidEmail(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Sends every recipient in the background and records progress on the broadcast row. */
const run = async (broadcast, recipients, content) => {
  await EmailBroadcastModel.update(serviceDb, broadcast.id, { status: "SENDING" });
  let sent = 0;
  let failed = 0;

  await Promise.all(
    recipients.map((r) =>
      EmailService.send(
        r.email,
        "broadcast",
        { ...content, name: r.name, unsubscribeUrl: r.unsubscribeUrl, preferencesUrl: r.preferencesUrl },
        {
          broadcastId: broadcast.id,
          headers: r.unsubscribeUrl ? { "List-Unsubscribe": `<${r.unsubscribeUrl}>`, Precedence: "bulk" } : { Precedence: "bulk" },
        }
      ).then((result) => {
        if (result?.ok) sent += 1;
        else failed += 1;
      })
    )
  );

  await EmailBroadcastModel.update(serviceDb, broadcast.id, {
    status: sent === 0 && failed > 0 ? "FAILED" : "COMPLETED",
    sent_count: sent,
    failed_count: failed,
    completed_at: new Date().toISOString(),
  });
};

export const BroadcastService = {
  /** Validates, resolves recipients, records the campaign and starts sending. Returns immediately. */
  async start({ adminId, audience, userIds, subject, message, ctaLabel, ctaUrl }) {
    const aud = String(audience || "").toUpperCase();
    if (!EMAIL_AUDIENCES.includes(aud)) throw ApiError.badRequest("Invalid audience.");
    const cleanSubject = String(subject || "").trim();
    const cleanMessage = String(message || "").trim();
    if (cleanSubject.length < 3) throw ApiError.badRequest("Please enter an email subject.");
    if (cleanMessage.length < 5) throw ApiError.badRequest("Please write the email message.");
    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) throw ApiError.badRequest("Add both a button label and a button link, or neither.");
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) throw ApiError.badRequest("The button link must start with http:// or https://");

    const recipients = dedupe(await resolveRecipients({ audience: aud, userIds: Array.isArray(userIds) ? userIds : [] }));
    if (recipients.length === 0) throw ApiError.badRequest("No recipients match this audience.");

    const content = {
      subject: cleanSubject.slice(0, 200),
      message: cleanMessage.slice(0, 10000),
      ctaLabel: ctaLabel ? String(ctaLabel).trim().slice(0, 60) : undefined,
      ctaUrl: ctaUrl ? String(ctaUrl).trim() : undefined,
    };

    const broadcast = await EmailBroadcastModel.create(serviceDb, {
      admin_id: adminId,
      audience: aud,
      subject: content.subject,
      message: content.message,
      cta_label: content.ctaLabel || null,
      cta_url: content.ctaUrl || null,
      recipients_count: recipients.length,
    });

    run(broadcast, recipients, content).catch(async (error) => {
      console.error("[email] broadcast failed:", error);
      await EmailBroadcastModel.update(serviceDb, broadcast.id, { status: "FAILED" }).catch(() => {});
    });

    return broadcast;
  },
};
