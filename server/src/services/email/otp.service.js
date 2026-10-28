import crypto from "crypto";
import { config } from "../../config/env.js";
import { serviceDb } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { normalizeEmail, isValidEmail } from "../../utils/normalize.js";
import { OtpModel } from "../../models/email.model.js";
import { EmailService } from "./email.service.js";

export const OTP_PURPOSES = ["SIGNUP", "EMAIL_CHANGE", "LOGIN"];

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
// A verified code must be used (e.g. to finish sign-up) within this window.
const VERIFIED_VALID_MINUTES = 30;

// Codes are stored only as salted hashes; the salt is derived from a server secret.
const pepper = crypto
  .createHash("sha256")
  .update(`eduhire-otp:${process.env.OTP_SECRET || config.supabase.serviceRoleKey}`)
  .digest("hex");

const hashCode = (email, purpose, code) =>
  crypto.createHmac("sha256", pepper).update(`${email}|${purpose}|${code}`).digest("hex");

const safeEqual = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const generateCode = () => String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

const assertPurpose = (purpose) => {
  if (!OTP_PURPOSES.includes(purpose)) throw ApiError.badRequest("Invalid verification purpose.");
};

export const OtpService = {
  /** Creates and emails a fresh code. Enforces cooldown and hourly limits. */
  async send({ email, purpose = "SIGNUP", ip }) {
    assertPurpose(purpose);
    const normEmail = normalizeEmail(email);
    if (!isValidEmail(normEmail)) throw ApiError.badRequest("Please enter a valid email address.");

    if (purpose === "SIGNUP") {
      const { data: duplicate } = await serviceDb.rpc("check_account_exists", {
        p_email: normEmail,
        p_phone: null,
        p_exclude_user_id: null,
      });
      if (duplicate?.exists) {
        throw ApiError.conflict("An account already exists with this email. Please log in instead.", { duplicate: true });
      }
    }

    const latest = await OtpModel.findLatest(serviceDb, normEmail, purpose);
    if (latest) {
      const elapsed = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw ApiError.tooMany(`Please wait ${retryAfter}s before requesting another code.`, { retryAfter });
      }
    }
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if ((await OtpModel.countSince(serviceDb, normEmail, purpose, hourAgo)) >= MAX_SENDS_PER_HOUR) {
      throw ApiError.tooMany("Too many codes requested. Please try again in an hour.", { retryAfter: 3600 });
    }

    const code = generateCode();
    const minutes = config.email.otpTtlMinutes;
    await OtpModel.create(serviceDb, {
      email: normEmail,
      purpose,
      code_hash: hashCode(normEmail, purpose, code),
      expires_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
      ip_address: ip ? String(ip).slice(0, 64) : null,
    });

    const result = await EmailService.sendNow(normEmail, "otp", { code, purpose, minutes });
    if (!result.ok && !result.skipped) {
      throw ApiError.unavailable("We couldn't send the verification email right now. Please try again in a minute.");
    }
    if (result.skipped) {
      throw ApiError.unavailable("Email delivery is not configured on the server. Please contact support.");
    }

    return { email: normEmail, expiresInSeconds: minutes * 60, resendInSeconds: RESEND_COOLDOWN_SECONDS };
  },

  /** Checks a code. Wrong guesses count toward MAX_ATTEMPTS. */
  async verify({ email, purpose = "SIGNUP", code }) {
    assertPurpose(purpose);
    const normEmail = normalizeEmail(email);
    const cleanCode = String(code || "").replace(/\D/g, "");
    if (cleanCode.length !== CODE_LENGTH) throw ApiError.badRequest(`Please enter the ${CODE_LENGTH}-digit code.`);

    const otp = await OtpModel.findLatest(serviceDb, normEmail, purpose);
    if (!otp || otp.consumed_at) throw ApiError.badRequest("No active code for this email. Please request a new one.");
    if (otp.verified_at) return { verified: true, email: normEmail };
    if (new Date(otp.expires_at).getTime() < Date.now()) throw ApiError.badRequest("This code has expired. Please request a new one.");
    if (otp.attempts >= MAX_ATTEMPTS) throw ApiError.tooMany("Too many incorrect attempts. Please request a new code.");

    if (!safeEqual(otp.code_hash, hashCode(normEmail, purpose, cleanCode))) {
      const attempts = otp.attempts + 1;
      await OtpModel.update(serviceDb, otp.id, { attempts });
      const left = MAX_ATTEMPTS - attempts;
      throw ApiError.badRequest(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Please request a new code.");
    }

    await OtpModel.update(serviceDb, otp.id, { verified_at: new Date().toISOString() });
    return { verified: true, email: normEmail };
  },

  /** True when the email has a verified, unused code (does not consume it). */
  async isVerified({ email, purpose = "SIGNUP" }) {
    return Boolean(await OtpModel.findVerifiedUnconsumed(serviceDb, normalizeEmail(email), purpose, VERIFIED_VALID_MINUTES));
  },

  /** Marks a verified code as used. Returns false when there is no valid verified code. */
  async consume({ email, purpose = "SIGNUP" }) {
    const otp = await OtpModel.findVerifiedUnconsumed(serviceDb, normalizeEmail(email), purpose, VERIFIED_VALID_MINUTES);
    if (!otp) return false;
    await OtpModel.update(serviceDb, otp.id, { consumed_at: new Date().toISOString() });
    return true;
  },
};
