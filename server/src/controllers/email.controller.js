import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { isValidEmail } from "../utils/normalize.js";
import { config, isEmailConfigured } from "../config/env.js";
import { mailMode, verifyMailTransport } from "../config/mailer.js";
import { OtpService } from "../services/email/otp.service.js";
import { SubscriberService } from "../services/email/subscriber.service.js";
import { BroadcastService } from "../services/email/broadcast.service.js";
import { EmailService } from "../services/email/email.service.js";
import { isSignupOtpRequired } from "../services/auth.service.js";
import { SubscriberModel, EmailBroadcastModel, EmailLogModel } from "../models/email.model.js";
import { AdminActionModel } from "../models/cms.model.js";

export const EmailController = {
  // ---- Public ----

  /** Tells the sign-up form whether to show the email-code step. */
  authConfig: (req, res) => {
    res.json({ success: true, data: { signupOtpRequired: isSignupOtpRequired(), otpLength: 6 } });
  },

  sendOtp: asyncHandler(async (req, res) => {
    const result = await OtpService.send({ email: req.body.email, purpose: String(req.body.purpose || "SIGNUP").toUpperCase(), ip: req.ip });
    res.json({ success: true, message: `We sent a 6-digit code to ${result.email}.`, data: result });
  }),

  verifyOtp: asyncHandler(async (req, res) => {
    const result = await OtpService.verify({
      email: req.body.email,
      purpose: String(req.body.purpose || "SIGNUP").toUpperCase(),
      code: req.body.code,
    });
    res.json({ success: true, message: "Email verified.", data: result });
  }),

  subscribe: asyncHandler(async (req, res) => {
    const { email, name, role, source } = req.body;
    const result = await SubscriberService.subscribe({ email, name, role, source });
    res.status(result.alreadySubscribed ? 200 : 201).json({
      success: true,
      message: result.alreadySubscribed ? "You're already subscribed." : "Subscribed! Check your inbox for a welcome email.",
      data: result,
    });
  }),

  unsubscribe: asyncHandler(async (req, res) => {
    const result = await SubscriberService.unsubscribe(req.body.token || req.query.token);
    res.json({ success: true, message: "You've been unsubscribed.", data: result });
  }),

  // ---- Admin ----

  status: asyncHandler(async (req, res) => {
    const check = await verifyMailTransport();
    res.json({
      success: true,
      data: {
        mode: mailMode, // "smtp" | "log" | "disabled"
        configured: isEmailConfigured(),
        connected: check.ok,
        error: check.error || null,
        from: config.email.fromEmail,
        signupOtpRequired: isSignupOtpRequired(),
        queued: EmailService.queueSize(),
      },
    });
  }),

  sendTest: asyncHandler(async (req, res) => {
    const to = String(req.body.to || req.user.email || "").trim();
    if (!isValidEmail(to)) throw ApiError.badRequest("Please enter a valid email address.");
    const result = await EmailService.sendNow(to, "broadcast", {
      name: req.user.name,
      subject: "EduHire Bridge test email",
      message: "This is a test email from your EduHire Bridge admin panel. If you can read this, email delivery is working.",
    });
    if (!result.ok) throw ApiError.unavailable(result.skipped ? "SMTP is not configured on the server." : `Sending failed: ${result.error}`);
    res.json({ success: true, message: `Test email sent to ${to}.` });
  }),

  broadcast: asyncHandler(async (req, res) => {
    const { audience, userIds, subject, message, ctaLabel, ctaUrl } = req.body;
    const broadcast = await BroadcastService.start({ adminId: req.user.id, audience, userIds, subject, message, ctaLabel, ctaUrl });
    await AdminActionModel.log(req.db, {
      adminId: req.user.id,
      actionType: "EMAIL_BROADCAST",
      targetId: broadcast.id,
      targetType: "EMAIL_BROADCAST",
      details: { audience: broadcast.audience, recipients: broadcast.recipients_count },
    }).catch(() => {});
    res.status(202).json({
      success: true,
      message: `Email broadcast queued for ${broadcast.recipients_count} recipient(s).`,
      data: broadcast,
    });
  }),

  listBroadcasts: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await EmailBroadcastModel.list(req.db, { limit: Number(req.query.limit) || 20 }) });
  }),

  logs: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await EmailLogModel.list(req.db, { limit: Number(req.query.limit) || 100, broadcastId: req.query.broadcastId }) });
  }),

  subscribers: asyncHandler(async (req, res) => {
    const list = await SubscriberModel.list(req.db, { status: req.query.status });
    res.json({ success: true, data: list, meta: { subscribed: list.filter((s) => s.status === "SUBSCRIBED").length } });
  }),
};
