/**
 * In-memory token holder:
 * - Access token: stored in memory only (short-lived Supabase JWT).
 * - Refresh token: stored strictly in secure httpOnly cookies (no localStorage).
 */
let accessToken = null;
let expiresAt = null; // unix seconds
const REFRESH_STORAGE_KEY = "eh_refresh_token";

export const tokenStorage = {
  getAccessToken: () => accessToken,

  getExpiresAt: () => expiresAt,

  getRefreshToken: () => null,

  /** Accepts the API's session shape: { accessToken, expiresAt }. */
  set(session) {
    accessToken = session?.accessToken || null;
    expiresAt = session?.expiresAt || null;
    // Clear any legacy refresh tokens from localStorage
    try {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } catch {}
  },

  clear() {
    accessToken = null;
    expiresAt = null;
    try {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } catch {}
  },
};
