import { config } from "../config/env.js";

const { session } = config;
// Root path so the refresh cookie is available across all API paths and sub-endpoints
const COOKIE_PATH = "/";

const isLocalHttp = (req) => {
  if (!req || config.nodeEnv === "production") return false;
  const proto = String(req.get?.("x-forwarded-proto") || req.protocol || "").toLowerCase();
  return proto === "http";
};

const baseOptions = (req) => {
  const localHttp = isLocalHttp(req);
  const sameSite = localHttp ? "lax" : session.cookieSameSite;
  const secure = localHttp ? false : session.cookieSecure || sameSite === "none"; // SameSite=None requires Secure
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: COOKIE_PATH,
    ...(session.cookieDomain ? { domain: session.cookieDomain } : {}),
  };
};

export const setRefreshCookie = (res, token, expiresAt) => {
  res.cookie(session.cookieName, token, { ...baseOptions(res.req), expires: new Date(expiresAt) });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(session.cookieName, baseOptions(res.req));
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
