import axios from "axios";
import { tokenStorage } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_URL || "/api";

/**
 * Every request from the UI goes through this instance.
 * withCredentials sends the httpOnly refresh cookie to /api/auth/* (needed when
 * the API is on another origin in production; harmless same-origin).
 */
export const http = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Cross-tab coordination: logout in one tab signs out the others.
// ---------------------------------------------------------------------------
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("eduhire-auth") : null;
let onRemoteLogout = () => {};
let onSessionExpired = () => {};

export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};
export const setRemoteLogoutHandler = (handler) => {
  onRemoteLogout = handler;
};
export const broadcastLogout = () => channel?.postMessage({ type: "logout" });

channel?.addEventListener("message", (event) => {
  if (event.data?.type === "logout") {
    clearSession();
    onRemoteLogout();
  }
});

// ---------------------------------------------------------------------------
// Access-token lifecycle
// ---------------------------------------------------------------------------
let refreshTimer = null;
let refreshPromise = null;
const REFRESH_EARLY_SECONDS = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scheduleRefresh = () => {
  clearTimeout(refreshTimer);
  const exp = tokenStorage.getExpiresAt();
  if (!exp) return;
  // Refresh a minute before expiry so requests rarely hit a 401.
  const delay = Math.max(5000, exp * 1000 - Date.now() - REFRESH_EARLY_SECONDS * 1000);
  refreshTimer = setTimeout(() => {
    refreshAccessToken().catch(() => {
      clearSession();
      onSessionExpired();
    });
  }, delay);
};

/** Stores a session returned by the API ({ accessToken, expiresAt }) and schedules its refresh. */
export const applySession = (session) => {
  tokenStorage.set(session);
  scheduleRefresh();
};

export const clearSession = () => {
  clearTimeout(refreshTimer);
  tokenStorage.clear();
};

const callRefresh = () => {
  const refreshToken = tokenStorage.getRefreshToken();
  return axios.post(
    `${baseURL}/auth/refresh`,
    refreshToken ? { refreshToken } : {},
    { withCredentials: true }
  );
};

const runRefresh = async () => {
  let response;
  try {
    response = await callRefresh();
  } catch (error) {
    // Another tab rotated the cookie a moment ago — the browser now holds the new one.
    if (error?.response?.data?.details?.code !== "STALE_REFRESH_TOKEN") throw error;
    await sleep(400);
    response = await callRefresh();
  }
  const data = response.data?.data;
  if (!data?.session?.accessToken) throw new Error("Refresh failed");
  applySession(data.session);
  return data; // { session, user, needsRole }
};

/**
 * Gets a new access token using the refresh cookie. One refresh at a time per
 * tab, and (where supported) one at a time across tabs via the Web Locks API,
 * so tabs never race to rotate the same refresh token.
 */
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    const task = typeof navigator !== "undefined" && navigator.locks ? () => navigator.locks.request("eduhire-auth-refresh", runRefresh) : runRefresh;
    refreshPromise = task().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------
http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints whose 401 means "wrong credentials / no session", not "access token expired".
const NO_RETRY = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/oauth/complete", "/auth/otp", "/auth/forgot-password", "/auth/reset-password", "/auth/logout", "/auth/config", "/auth/google"];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || original._retry || NO_RETRY.some((path) => original.url?.startsWith(path));

    if (status === 401 && !skip) {
      original._retry = true;
      try {
        await refreshAccessToken();
        original.headers.Authorization = `Bearer ${tokenStorage.getAccessToken()}`;
        return http(original);
      } catch {
        clearSession();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

/** Unwraps the API envelope `{ success, data }`. */
export const unwrap = (promise) => promise.then((res) => res.data?.data);

/** Unwraps but keeps `meta` (used by lists that return counts or ids). */
export const unwrapWithMeta = (promise) => promise.then((res) => ({ data: res.data?.data, meta: res.data?.meta || {} }));

/** Readable message from an API or network error. */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  // The dev proxy answers 500/502/504 with no JSON body when the API isn't running.
  if (error?.response && error.response.status >= 500 && typeof error.response.data !== "object") {
    return "The EduHire server isn't responding. Make sure the API is running and try again.";
  }
  if (error?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (error?.message === "Network Error") return "Cannot reach the EduHire server. Check your connection and try again.";
  return error?.message || fallback;
};
