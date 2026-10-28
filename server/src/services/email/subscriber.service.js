import { serviceDb } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { normalizeEmail, isValidEmail } from "../../utils/normalize.js";
import { SubscriberModel } from "../../models/email.model.js";
import { EmailService } from "./email.service.js";
import { appUrl } from "./templates.js";

const ROLES = ["TEACHER", "INSTITUTE", "OTHER"];

export const unsubscribeUrlFor = (token) => appUrl(`/unsubscribe?token=${encodeURIComponent(token)}`);

export const SubscriberService = {
  async subscribe({ email, name, role, source }) {
    const normEmail = normalizeEmail(email);
    if (!isValidEmail(normEmail)) throw ApiError.badRequest("Please enter a valid email address.");
    const normRole = ROLES.includes(String(role || "").toUpperCase()) ? String(role).toUpperCase() : null;

    let subscriber = await SubscriberModel.findByEmail(serviceDb, normEmail);
    if (subscriber?.status === "SUBSCRIBED") return { alreadySubscribed: true };

    if (subscriber) {
      subscriber = await SubscriberModel.update(serviceDb, subscriber.id, {
        status: "SUBSCRIBED",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
        ...(name ? { name: String(name).trim().slice(0, 120) } : {}),
        ...(normRole ? { role: normRole } : {}),
      });
    } else {
      subscriber = await SubscriberModel.create(serviceDb, {
        email: normEmail,
        name: name ? String(name).trim().slice(0, 120) : null,
        role: normRole,
        source: source ? String(source).slice(0, 40) : "website",
      });
    }

    EmailService.background(
      EmailService.send(
        normEmail,
        "subscribeConfirm",
        { name: subscriber.name, unsubscribeUrl: unsubscribeUrlFor(subscriber.unsubscribe_token) },
        { headers: { "List-Unsubscribe": `<${unsubscribeUrlFor(subscriber.unsubscribe_token)}>` } }
      )
    );
    return { subscribed: true };
  },

  async unsubscribe(token) {
    if (!token || typeof token !== "string") throw ApiError.badRequest("This unsubscribe link is invalid.");
    const subscriber = await SubscriberModel.findByToken(serviceDb, token.trim());
    if (!subscriber) throw ApiError.notFound("This unsubscribe link is invalid or has expired.");
    if (subscriber.status !== "UNSUBSCRIBED") {
      await SubscriberModel.update(serviceDb, subscriber.id, { status: "UNSUBSCRIBED", unsubscribed_at: new Date().toISOString() });
    }
    return { email: subscriber.email };
  },
};
