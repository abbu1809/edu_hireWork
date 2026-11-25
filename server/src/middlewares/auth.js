import { serviceDb, createUserClient } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../services/session.service.js";
import { sha256, decodeJwtPayload } from "../utils/crypto.js";
import { cache } from "../utils/cache.js";

const AUTH_CACHE_MS = 30 * 1000;

const readBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

/** Clears cached auth identity for a specific token (e.g. on logout). */
export const invalidateAuthToken = (token) => {
  if (token) cache.del(`auth:tok:${sha256(token)}`);
};

/**
 * Resolves and caches { authUser, profile } for a valid, non-revoked bearer token.
 * Runs JWT verification, active-session check, and profile lookup in parallel on cache miss.
 */
export const resolveTokenIdentity = async (token) => {
  const payload = decodeJwtPayload(token);
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload?.exp && payload.exp <= nowSec) {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.", { code: "ACCESS_TOKEN_EXPIRED" });
  }

  const tokenKey = `auth:tok:${sha256(token)}`;
  const cached = cache.get(tokenKey);

  // Always check SessionService (which has its own 30s cache and is revoked immediately on logout).
  if (cached) {
    const session = await SessionService.resolveActive(token);
    if (!session || session.userId !== cached.authUser.id) {
      cache.del(tokenKey);
      throw ApiError.unauthorized("This session was signed out. Please sign in again.", { code: "SESSION_REVOKED" });
    }
    return { ...cached, session };
  }

  const sub = payload?.sub;
  const [{ data, error }, session, profileRes] = await Promise.all([
    serviceDb.auth.getUser(token),
    SessionService.resolveActive(token),
    sub
      ? serviceDb.from("profiles").select("id, name, email, role").eq("id", sub).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (error || !data?.user) {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.", { code: "ACCESS_TOKEN_EXPIRED" });
  }
  if (!session || session.userId !== data.user.id) {
    throw ApiError.unauthorized("This session was signed out. Please sign in again.", { code: "SESSION_REVOKED" });
  }

  let profile = profileRes?.data || null;
  if (!profile && data.user.id !== sub) {
    const res = await serviceDb.from("profiles").select("id, name, email, role").eq("id", data.user.id).maybeSingle();
    profile = res?.data || null;
  }

  const remainingMs = payload?.exp ? Math.max(1000, (payload.exp - nowSec) * 1000) : AUTH_CACHE_MS;
  cache.set(tokenKey, { authUser: data.user, profile }, Math.min(AUTH_CACHE_MS, remainingMs));

  return { authUser: data.user, profile, session };
};

/**
 * Resolves the Supabase user behind a bearer token and loads their role.
 * Attaches req.auth = { token, user }, req.user = { id, email, role, name }
 * and req.db = a Supabase client that runs queries as that user (RLS applies).
 */
const resolveUser = async (req, token) => {
  const { authUser, profile, session } = await resolveTokenIdentity(token);

  req.auth = { token, user: authUser, sessionId: session.sessionId };
  req.user = {
    id: authUser.id,
    email: authUser.email,
    role: profile?.role ? profile.role.toLowerCase() : null,
    name: profile?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || "",
    hasProfile: Boolean(profile),
  };
  req.db = createUserClient(token);
};

/** Requires a valid session. */
export const authenticate = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized();
    await resolveUser(req, token);
    next();
  } catch (err) {
    next(err);
  }
};

/** Attaches the user when a valid token is present; otherwise continues anonymously. */
export const optionalAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) return next();
  try {
    await resolveUser(req, token);
  } catch {
    // An expired token on a public endpoint is treated as anonymous.
  }
  next();
};

/** Restricts a route to the given roles ("admin", "teacher", "institute"). */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!req.user.role) {
    return next(ApiError.forbidden("Please choose an account type to finish setting up your account."));
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action is only available to ${roles.join(" or ")} accounts.`));
  }
  next();
};
