/**
 * Dual token holder:
 * - Access token: stored in memory only (short-lived Supabase JWT).
 * - Refresh token: stored in httpOnly cookie where permitted, with a localStorage
 *   fallback so cross-site / 3rd-party cookie blocking (Vercel client + Render API)
 *   does not log users out on page refresh.
 */
let accessToken = null;
let expiresAt = null; // unix seconds
const REFRESH_STORAGE_KEY = "eh_refresh_token";

export const tokenStorage = {
  getAccessToken: () => accessToken,

  getExpiresAt: () => expiresAt,

  getRefreshToken: () => {
    try {
      return localStorage.getItem(REFRESH_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  },

  /** Accepts the API's session shape: { accessToken, expiresAt, refreshToken }. */
  set(session) {
    accessToken = session?.accessToken || null;
    expiresAt = session?.expiresAt || null;
    if (session?.refreshToken) {
      try {
        localStorage.setItem(REFRESH_STORAGE_KEY, session.refreshToken);
      } catch {}
    }
  },

  clear() {
    accessToken = null;
    expiresAt = null;
    try {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } catch {}
  },
};
