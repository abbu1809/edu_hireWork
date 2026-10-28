import crypto from "crypto";
import { config } from "../config/env.js";

/**
 * 32-byte key for AES-256-GCM. Uses TOKEN_ENCRYPTION_KEY (64 hex chars or
 * base64) when set; otherwise derives one from the service-role key so the
 * server works out of the box. Set an explicit key in production — rotating
 * the service key would otherwise invalidate stored sessions.
 */
const encryptionKey = (() => {
  const raw = (process.env.TOKEN_ENCRYPTION_KEY || "").trim();
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
    if (key.length === 32) return key;
    console.warn("[EduHire API] TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64). Falling back to a derived key.");
  }
  return crypto.createHash("sha256").update(`eduhire-session-key:${config.supabase.serviceRoleKey}`).digest();
})();

/** Encrypts a string → "v1.<iv>.<tag>.<ciphertext>" (base64url parts). */
export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
};

/** Decrypts a value produced by encrypt(). Throws if it was tampered with. */
export const decrypt = (payload) => {
  const [version, iv, tag, ciphertext] = String(payload || "").split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Malformed encrypted value");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
};

/** SHA-256 hex digest — used to store refresh tokens without keeping the token itself. */
export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

/** URL-safe random token with 256 bits of entropy. */
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

/** Reads a JWT's payload WITHOUT verifying it (only for tokens already verified by Supabase). */
export const decodeJwtPayload = (token) => {
  try {
    const part = String(token).split(".")[1];
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return {};
  }
};
