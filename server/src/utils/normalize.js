export const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

export const normalizePhone = (phone) => {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return "+91" + digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return "+91" + digits.slice(1);
  if (digits.length === 10) return "+91" + digits;
  return digits.length > 0 ? "+" + digits : "";
};

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

export const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Escapes characters that have meaning inside PostgREST filter strings. */
export const escapeFilter = (value) => String(value || "").replace(/[,()%*\\]/g, " ").trim();
