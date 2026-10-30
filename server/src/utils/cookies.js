import { config } from "../config/env.js";

const { session } = config;
// Root path so the refresh cookie is available across all API paths and sub-endpoints
const COOKIE_PATH = "/";

const baseOptions = () => ({
  httpOnly: true,
  secure: session.cookieSecure || session.cookieSameSite === "none", // SameSite=None requires Secure
  sameSite: session.cookieSameSite,
  path: COOKIE_PATH,
  ...(session.cookieDomain ? { domain: session.cookieDomain } : {}),
});

export const setRefreshCookie = (res, token, expiresAt) => {
  res.cookie(session.cookieName, token, { ...baseOptions(), expires: new Date(expiresAt) });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(session.cookieName, baseOptions());
};

/** Minimal cookie-header parser (avoids a dependency for one cookie). */
const parseCookies = (header = "") =>
  header.split(";").reduce((acc, part) => {
    const index = part.indexOf("=");
    if (index > 0) {
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {});

/**
 * Refresh token from the httpOnly cookie (browsers) or the request body
 * (native / API clients that can't use cookies).
 */
export const readRefreshToken = (req) => parseCookies(req.headers.cookie)[session.cookieName] || req.body?.refreshToken || null;
