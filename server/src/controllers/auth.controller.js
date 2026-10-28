import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { isValidEmail } from "../utils/normalize.js";
import { decodeJwtPayload } from "../utils/crypto.js";
import { setRefreshCookie, clearRefreshCookie, readRefreshToken } from "../utils/cookies.js";
import { AuthService } from "../services/auth.service.js";
import { SessionService } from "../services/session.service.js";
import { serviceDb } from "../config/supabase.js";

const assertPassword = (password) => {
  if (!password || String(password).length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters.");
  }
};

/**
 * Native / API clients that can't hold cookies send `X-Auth-Mode: token` and
 * receive the refresh token in the body. Browsers never see it outside the
 * httpOnly cookie.
 */
const wantsTokenInBody = (req) => String(req.get("x-auth-mode") || "").toLowerCase() === "token";

/** Public session shape returned to clients. */
const toClientSession = (req, session) => ({
  accessToken: session.accessToken,
  expiresAt: session.accessExpiresAt,
  refreshExpiresAt: session.refreshExpiresAt,
  ...(wantsTokenInBody(req) ? { refreshToken: session.refreshToken } : {}),
});

/** Creates the DB session for a fresh Supabase session and sets the refresh cookie. */
const issueSession = async (req, res, upstream) => {
  const session = await SessionService.start({ upstream, req });
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  return toClientSession(req, session);
};

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    const { name, email, password, phone, role, city, subject } = req.body;
    if (!name || name.trim().length < 2) throw ApiError.badRequest("Please enter your full name.");
    if (!isValidEmail(email)) throw ApiError.badRequest("Please enter a valid email address.");
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      throw ApiError.badRequest("Please enter a valid 10-digit mobile number.");
    }
    assertPassword(password);

    const result = await AuthService.register({ name, email, password, phone, role, city, subject });
    const session = result.session ? await issueSession(req, res, result.session) : null;
    res.status(201).json({ success: true, data: { ...result, session } });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!isValidEmail(email)) throw ApiError.badRequest("Please enter a valid email address.");
    assertPassword(password);
    const result = await AuthService.login({ email, password });
    const session = await issueSession(req, res, result.session);
    res.json({ success: true, data: { ...result, session } });
  }),

  completeOAuth: asyncHandler(async (req, res) => {
    const { accessToken, refreshToken, role } = req.body;
    if (!accessToken) throw ApiError.badRequest("Missing Google sign-in token.");
    const result = await AuthService.completeOAuth({ accessToken, refreshToken, role });
    // Google / email-link returns carry a refresh token → start a session. Without
    // one (role picked after a password login) the existing session continues.
    const session = refreshToken ? await issueSession(req, res, result.session) : null;
    res.json({ success: true, data: { ...result, session } });
  }),

  /**
   * Rotates the refresh token (cookie) and returns a new access token plus the
   * current user, so a page reload restores the session in one request.
   */
  refresh: asyncHandler(async (req, res) => {
    let session;
    try {
      session = await SessionService.refresh({ refreshToken: readRefreshToken(req), req });
    } catch (error) {
      // A lost race leaves the (already rotated) cookie in place; anything else clears it.
      if (error?.details?.code !== "STALE_REFRESH_TOKEN") clearRefreshCookie(res);
      throw error;
    }
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);

    const email = decodeJwtPayload(session.accessToken).email;
    const user = await AuthService.buildCurrentUser({ id: session.userId, email });
    res.json({ success: true, data: { session: toClientSession(req, session), user, needsRole: !user } });
  }),

  /** Ends this device's session. Works even if the access token already expired. */
  logout: asyncHandler(async (req, res) => {
    // Best effort: the user must always end up signed out locally, even if the
    // database is briefly unreachable (the row then simply expires).
    try {
      await SessionService.revokeByRefreshToken(readRefreshToken(req), "logout");
      if (req.auth?.token) await AuthService.logout(req.auth.token);
    } catch (error) {
      console.warn("[auth] logout: could not revoke session server-side:", error.message);
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: "Logged out." });
  }),

  /** Signs out every device, including this one. */
  logoutAll: asyncHandler(async (req, res) => {
    const count = await SessionService.revokeAllForUser(req.user.id, { reason: "logout_all" });
    try {
      // Also invalidate every Supabase refresh token for this user.
      await serviceDb.auth.admin.signOut(req.auth.token, "global");
    } catch {
      /* our sessions are already revoked */
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: `Signed out of ${count} session(s).`, data: { count } });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await AuthService.buildCurrentUser(req.auth.user);
    res.json({
      success: true,
      data: {
        user,
        needsRole: !user,
        email: req.auth.user.email,
        session: { id: req.auth.sessionId, accessExpiresAt: decodeJwtPayload(req.auth.token).exp || null },
      },
    });
  }),

  listSessions: asyncHandler(async (req, res) => {
    const sessions = await SessionService.listForUser(req.user.id);
    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        userAgent: s.user_agent,
        ipAddress: s.ip_address,
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at,
        expiresAt: s.expires_at,
        current: s.id === req.auth.sessionId,
      })),
    });
  }),

  revokeSession: asyncHandler(async (req, res) => {
    await SessionService.revokeOne(req.user.id, req.params.id);
    if (req.params.id === req.auth.sessionId) clearRefreshCookie(res);
    res.json({ success: true, message: "Session signed out." });
  }),

  /** Signs out all other devices, keeping this one. */
  revokeOtherSessions: asyncHandler(async (req, res) => {
    const count = await SessionService.revokeAllForUser(req.user.id, { reason: "revoked_others", exceptId: req.auth.sessionId });
    res.json({ success: true, message: `Signed out of ${count} other session(s).`, data: { count } });
  }),

  googleUrl: asyncHandler(async (req, res) => {
    const url = await AuthService.getGoogleAuthUrl({
      role: String(req.query.role || "").toLowerCase(),
      intent: req.query.intent,
    });
    res.json({ success: true, data: { url } });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    if (!isValidEmail(req.body.email)) throw ApiError.badRequest("Please enter a valid email address.");
    await AuthService.sendPasswordReset(req.body.email);
    res.json({ success: true, message: "Password reset link sent to your registered email." });
  }),

  /** Password reset from the email link: every existing session is signed out. */
  resetPassword: asyncHandler(async (req, res) => {
    const { accessToken, password } = req.body;
    if (!accessToken) throw ApiError.badRequest("This reset link is invalid. Please request a new one.");
    assertPassword(password);
    const userId = await AuthService.resetPassword({ accessToken, password });
    if (userId) await SessionService.revokeAllForUser(userId, { reason: "password_reset" });
    clearRefreshCookie(res);
    res.json({ success: true, message: "Password updated successfully! You can now log in." });
  }),

  /** Password change while signed in: other devices are signed out, this one stays. */
  changePassword: asyncHandler(async (req, res) => {
    assertPassword(req.body.password);
    await AuthService.setPassword(req.user.id, req.body.password);
    const count = await SessionService.revokeAllForUser(req.user.id, { reason: "password_changed", exceptId: req.auth.sessionId });
    res.json({
      success: true,
      message: count ? `Password updated. Signed out of ${count} other device(s).` : "Password updated successfully.",
    });
  }),
};
