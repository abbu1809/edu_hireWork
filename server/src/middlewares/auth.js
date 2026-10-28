import { serviceDb, createUserClient } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../services/session.service.js";

const readBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

/**
 * Resolves the Supabase user behind a bearer token and loads their role.
 * Attaches req.auth = { token, user }, req.user = { id, email, role, name }
 * and req.db = a Supabase client that runs queries as that user (RLS applies).
 */
const resolveUser = async (req, token) => {
  // Verify the JWT with Supabase and check our session row in parallel.
  const [{ data, error }, session] = await Promise.all([serviceDb.auth.getUser(token), SessionService.resolveActive(token)]);
  if (error || !data?.user) {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.", { code: "ACCESS_TOKEN_EXPIRED" });
  }
  // Signed out on this or another device (or never issued by this API): reject now,
  // rather than letting the access token live until it expires.
  if (!session || session.userId !== data.user.id) {
    throw ApiError.unauthorized("This session was signed out. Please sign in again.", { code: "SESSION_REVOKED" });
  }

  const authUser = data.user;
  const { data: profile } = await serviceDb
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", authUser.id)
    .maybeSingle();

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
