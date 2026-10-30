import dotenv from "dotenv";

dotenv.config();

const list = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrls: list(process.env.CLIENT_URL, "http://localhost:3000"),

  supabase: {
    url: (process.env.SUPABASE_URL || "").trim(),
    anonKey: (process.env.SUPABASE_ANON_KEY || "").trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  },

  adminEmail: (process.env.ADMIN_EMAIL || "admin@eduhirebridge.in").trim().toLowerCase(),

  razorpay: {
    keyId: (process.env.RAZORPAY_KEY_ID || "").trim(),
    keySecret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
    webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim(),
  },

  pricing: {
    instituteUnlockFee: Number(process.env.INSTITUTE_UNLOCK_FEE) || 499,
  },

  session: {
    // Refresh-token session lifetime (absolute). Each refresh rotates the token.
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
    cookieName: (process.env.REFRESH_COOKIE_NAME || "eh_rt").trim(),
    // "none" in production (with Secure) so cross-site requests between frontend (Vercel) and API (Render) work.
    cookieSameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "none" : "lax")).trim().toLowerCase(),
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : (process.env.NODE_ENV === "production" || (process.env.COOKIE_SAMESITE || "").toLowerCase() === "none"),
    // Optional, e.g. ".eduhirebridge.in" to share the cookie across subdomains.
    cookieDomain: (process.env.COOKIE_DOMAIN || "").trim() || undefined,
  },

  email: {
    host: (process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    // true for port 465 (implicit TLS); false uses STARTTLS on 587.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : Number(process.env.SMTP_PORT) === 465,
    user: (process.env.SMTP_USER || "").trim(),
    pass: (process.env.SMTP_PASS || "").trim(),
    fromEmail: (process.env.FROM_EMAIL || process.env.SMTP_USER || "no-reply@eduhirebridge.in").trim(),
    fromName: (process.env.FROM_NAME || "EduHire Bridge").trim(),
    replyTo: (process.env.REPLY_TO_EMAIL || "").trim(),
    // Address that receives copies of contact-form inquiries.
    adminNotifyEmail: (process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES) || 10,
    // Require an email OTP before sign-up. Set to "false" to fall back to Supabase confirmation emails.
    requireSignupOtp: process.env.REQUIRE_SIGNUP_OTP !== "false",
  },
};

// The primary client origin, used to build auth redirect links.
config.clientUrl = config.clientUrls[0];

export const missingRequiredEnv = () =>
  [
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_ANON_KEY", config.supabase.anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabase.serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

export const isRazorpayConfigured = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

export const isEmailConfigured = () => Boolean(config.email.host && config.email.user && config.email.pass);
