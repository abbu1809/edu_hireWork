/**
 * Access token holder — memory only.
 *
 * The access token (short-lived Supabase JWT) is never written to localStorage
 * or sessionStorage, so an injected script can't read a long-lived credential.
 * The refresh token lives in an httpOnly cookie set by the API; JavaScript
 * can't see it at all. On page load the app calls /auth/refresh to get a new
 * access token from that cookie.
 */
let accessToken = null;
let expiresAt = null; // unix seconds

// Clean up tokens written to localStorage by the previous version of the app.
try {
  window.localStorage.removeItem("eduhire_session");
} catch {
  /* storage unavailable */
}

export const tokenStorage = {
  getAccessToken: () => accessToken,

  getExpiresAt: () => expiresAt,

  /** Accepts the API's session shape: { accessToken, expiresAt }. */
  set(session) {
    accessToken = session?.accessToken || null;
    expiresAt = session?.expiresAt || null;
  },

  clear() {
    accessToken = null;
    expiresAt = null;
  },
};
