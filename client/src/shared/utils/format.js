/** "2026-10-04T…" → locale date, or "" when missing. */
export const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export const initialOf = (name, fallback = "U") => (name ? name.trim().charAt(0).toUpperCase() : fallback);

export const isVerifiedProfile = (entity) =>
  Boolean(entity?.verified) || entity?.verification_status === "Verified";

/** Dashboard home for a role. */
export const homePathForRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "institute") return "/institute";
  if (r === "teacher") return "/teacher";
  return "/";
};

/** Responsive auto-fill grid that never overflows narrow screens. */
export const autoGrid = (min, gap = "1.5rem") => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))`,
  gap,
});
