import { unwrap } from "../utils/ApiError.js";

const ACTIVE_COLUMNS = "id, user_id, user_agent, ip_address, created_at, last_used_at, expires_at, supabase_session_id";

// Service-role only (RLS has no policies on user_sessions).
export const SessionModel = {
  async create(db, row) {
    return unwrap(await db.from("user_sessions").insert([row]).select().single());
  },

  async findByTokenHash(db, hash) {
    return unwrap(await db.from("user_sessions").select("*").eq("refresh_token_hash", hash).maybeSingle());
  },

  async findByPreviousHash(db, hash) {
    return unwrap(await db.from("user_sessions").select("*").eq("previous_token_hash", hash).maybeSingle());
  },

  /**
   * Rotates atomically: only succeeds if the row still holds `expectedHash`,
   * so two concurrent refreshes can't both win.
   */
  async rotate(db, id, expectedHash, updates) {
    return unwrap(
      await db.from("user_sessions").update(updates).eq("id", id).eq("refresh_token_hash", expectedHash).is("revoked_at", null).select().maybeSingle()
    );
  },

  async revoke(db, id, reason) {
    unwrap(
      await db
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
        .eq("id", id)
        .is("revoked_at", null)
    );
  },

  async revokeAllForUser(db, userId, reason, { exceptId } = {}) {
    let query = db
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (exceptId) query = query.neq("id", exceptId);
    const { data, error } = await query.select("id, supabase_session_id");
    if (error) throw error;
    return data || [];
  },

  async listActiveForUser(db, userId) {
    return (
      unwrap(
        await db
          .from("user_sessions")
          .select(ACTIVE_COLUMNS)
          .eq("user_id", userId)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("last_used_at", { ascending: false })
      ) || []
    );
  },

  async findActiveBySupabaseSession(db, supabaseSessionId) {
    return unwrap(
      await db
        .from("user_sessions")
        .select("id, user_id, expires_at")
        .eq("supabase_session_id", supabaseSessionId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle()
    );
  },
};
