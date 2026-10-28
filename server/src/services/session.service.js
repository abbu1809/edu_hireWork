import { config } from "../config/env.js";
import { serviceDb, createAnonClient } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { encrypt, decrypt, sha256, randomToken, decodeJwtPayload } from "../utils/crypto.js";
import { SessionModel } from "../models/session.model.js";

/**
 * Server-managed sessions.
 *
 * - Access token: the Supabase JWT (short-lived, ~1h). Sent as a Bearer token,
 *   kept in browser memory only. It must stay a Supabase JWT so database RLS
 *   keeps working for every request.
 * - Refresh token: an opaque random string we issue, delivered in an httpOnly
 *   cookie. Only its SHA-256 hash is stored (user_sessions). It rotates on every
 *   refresh; replaying a rotated token revokes the session (theft detection).
 * - The Supabase refresh token is stored AES-256-GCM encrypted and is only used
 *   server-side to mint new access tokens.
 */

// A just-rotated token presented again within this window is treated as a
// harmless race (two tabs refreshing together), not theft.
const REUSE_GRACE_SECONDS = 20;
// How long the "is this session still active?" check is cached per access token session.
const ACTIVE_CACHE_MS = 30 * 1000;

const activeCache = new Map(); // supabase session_id -> { sessionId, userId, at }

const ttlMs = () => config.session.refreshTtlDays * 24 * 60 * 60 * 1000;

const deviceInfo = (req) => ({
  user_agent: req?.get?.("user-agent")?.slice(0, 300) || null,
  ip_address: req?.ip ? String(req.ip).slice(0, 64) : null,
});

const accessExpiry = (accessToken, fallback) => fallback || decodeJwtPayload(accessToken).exp || null;

const forgetSupabaseSessions = (ids = []) => ids.forEach((id) => id && activeCache.delete(id));

const staleError = () =>
  ApiError.unauthorized("Your session was refreshed in another tab. Retrying…", { code: "STALE_REFRESH_TOKEN", retryable: true });

export const SessionService = {
  /** Exchanges a Supabase refresh token for a new Supabase session (overridable in tests). */
  async refreshUpstream(supabaseRefreshToken) {
    const { data, error } = await createAnonClient().auth.refreshSession({ refresh_token: supabaseRefreshToken });
    if (error || !data?.session) throw error || new Error("No session returned");
    return data.session;
  },

  /**
   * Starts a session after a successful login / sign-up / Google sign-in.
   * `upstream` is the Supabase session: { accessToken, refreshToken, expiresAt }.
   */
  async start({ upstream, req }) {
    if (!upstream?.accessToken || !upstream?.refreshToken) throw ApiError.unauthorized("Sign-in did not return a session.");
    const payload = decodeJwtPayload(upstream.accessToken);
    if (!payload.sub) throw ApiError.unauthorized("Sign-in token is invalid.");

    const refreshToken = randomToken();
    const expiresAt = new Date(Date.now() + ttlMs()).toISOString();

    const row = await SessionModel.create(serviceDb, {
      user_id: payload.sub,
      refresh_token_hash: sha256(refreshToken),
      supabase_refresh_token_enc: encrypt(upstream.refreshToken),
      supabase_session_id: payload.session_id || null,
      expires_at: expiresAt,
      ...deviceInfo(req),
    });

    return {
      sessionId: row.id,
      refreshToken,
      refreshExpiresAt: expiresAt,
      accessToken: upstream.accessToken,
      accessExpiresAt: accessExpiry(upstream.accessToken, upstream.expiresAt),
    };
  },

  /** Exchanges a refresh token for a new access token and a rotated refresh token. */
  async refresh({ refreshToken, req }) {
    if (!refreshToken) throw ApiError.unauthorized("Please sign in to continue.");
    const hash = sha256(refreshToken);
    const row = await SessionModel.findByTokenHash(serviceDb, hash);

    if (!row) {
      // Not the current token — was it a previous one? That's either a race or a replay.
      const rotated = await SessionModel.findByPreviousHash(serviceDb, hash);
      if (rotated && !rotated.revoked_at) {
        const sinceRotation = (Date.now() - new Date(rotated.rotated_at).getTime()) / 1000;
        if (sinceRotation <= REUSE_GRACE_SECONDS) throw staleError();
        await SessionModel.revoke(serviceDb, rotated.id, "refresh_token_reuse");
        forgetSupabaseSessions([rotated.supabase_session_id]);
        console.warn(`[auth] Refresh token reuse detected for user ${rotated.user_id}; session ${rotated.id} revoked.`);
        throw ApiError.unauthorized("For your security this session was ended. Please sign in again.", { code: "REFRESH_TOKEN_REUSED" });
      }
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }

    if (row.revoked_at) throw ApiError.unauthorized("This session was signed out. Please sign in again.");
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await SessionModel.revoke(serviceDb, row.id, "expired");
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }

    // Mint a fresh access token from the stored (encrypted) Supabase refresh token.
    let upstream;
    try {
      upstream = await SessionService.refreshUpstream(decrypt(row.supabase_refresh_token_enc));
    } catch {
      await SessionModel.revoke(serviceDb, row.id, "upstream_refresh_failed");
      forgetSupabaseSessions([row.supabase_session_id]);
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }

    const nextToken = randomToken();
    const updated = await SessionModel.rotate(serviceDb, row.id, hash, {
      refresh_token_hash: sha256(nextToken),
      previous_token_hash: hash,
      rotated_at: new Date().toISOString(),
      rotation_count: (row.rotation_count || 0) + 1,
      supabase_refresh_token_enc: encrypt(upstream.refresh_token),
      supabase_session_id: decodeJwtPayload(upstream.access_token).session_id || row.supabase_session_id,
      last_used_at: new Date().toISOString(),
      ...deviceInfo(req),
    });
    // Another request rotated this session first (concurrent refresh).
    if (!updated) throw staleError();

    return {
      sessionId: row.id,
      userId: row.user_id,
      refreshToken: nextToken,
      refreshExpiresAt: row.expires_at,
      accessToken: upstream.access_token,
      accessExpiresAt: accessExpiry(upstream.access_token, upstream.expires_at),
    };
  },

  /** Signs out the session that owns this refresh token (logout on this device). */
  async revokeByRefreshToken(refreshToken, reason = "logout") {
    if (!refreshToken) return;
    const row = await SessionModel.findByTokenHash(serviceDb, sha256(refreshToken));
    if (!row) return;
    await SessionModel.revoke(serviceDb, row.id, reason);
    forgetSupabaseSessions([row.supabase_session_id]);
  },

  /** Signs out every session of a user (optionally keeping the current one). */
  async revokeAllForUser(userId, { reason = "logout_all", exceptId } = {}) {
    const revoked = await SessionModel.revokeAllForUser(serviceDb, userId, reason, { exceptId });
    forgetSupabaseSessions(revoked.map((r) => r.supabase_session_id));
    return revoked.length;
  },

  async revokeOne(userId, sessionId) {
    const sessions = await SessionModel.listActiveForUser(serviceDb, userId);
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) throw ApiError.notFound("Session not found or already signed out.");
    await SessionModel.revoke(serviceDb, target.id, "revoked_by_user");
    forgetSupabaseSessions([target.supabase_session_id]);
  },

  async listForUser(userId) {
    return SessionModel.listActiveForUser(serviceDb, userId);
  },

  /**
   * Resolves the app session behind an access token (by its Supabase session_id).
   * Returns null when the session was revoked — the access token is then rejected
   * immediately instead of living until it expires. Cached briefly.
   */
  async resolveActive(accessToken) {
    const sid = decodeJwtPayload(accessToken).session_id;
    if (!sid) return null;
    const cached = activeCache.get(sid);
    if (cached && Date.now() - cached.at < ACTIVE_CACHE_MS) return cached;
    const row = await SessionModel.findActiveBySupabaseSession(serviceDb, sid);
    if (!row) {
      activeCache.delete(sid);
      return null;
    }
    const entry = { sessionId: row.id, userId: row.user_id, at: Date.now() };
    activeCache.set(sid, entry);
    return entry;
  },
};
