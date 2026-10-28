import { unwrap } from "../utils/ApiError.js";

// All email tables are service-role only (see database/migrations/20261005_email_services.sql).

export const OtpModel = {
  async create(db, row) {
    return unwrap(await db.from("email_otps").insert([row]).select().single());
  },

  /** Most recent code for an email + purpose. */
  async findLatest(db, email, purpose) {
    return unwrap(
      await db
        .from("email_otps")
        .select("*")
        .ilike("email", email)
        .eq("purpose", purpose)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  },

  async countSince(db, email, purpose, sinceIso) {
    const { count } = await db
      .from("email_otps")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .eq("purpose", purpose)
      .gte("created_at", sinceIso);
    return count || 0;
  },

  async update(db, id, updates) {
    return unwrap(await db.from("email_otps").update(updates).eq("id", id).select().maybeSingle());
  },

  /** A verified, unused code created within `withinMinutes`. */
  async findVerifiedUnconsumed(db, email, purpose, withinMinutes) {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
    return unwrap(
      await db
        .from("email_otps")
        .select("*")
        .ilike("email", email)
        .eq("purpose", purpose)
        .not("verified_at", "is", null)
        .is("consumed_at", null)
        .gte("verified_at", since)
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  },
};

export const SubscriberModel = {
  async findByEmail(db, email) {
    return unwrap(await db.from("newsletter_subscribers").select("*").ilike("email", email).maybeSingle());
  },

  async findByToken(db, token) {
    return unwrap(await db.from("newsletter_subscribers").select("*").eq("unsubscribe_token", token).maybeSingle());
  },

  async create(db, row) {
    return unwrap(await db.from("newsletter_subscribers").insert([row]).select().single());
  },

  async update(db, id, updates) {
    return unwrap(await db.from("newsletter_subscribers").update(updates).eq("id", id).select().maybeSingle());
  },

  async list(db, { status } = {}) {
    let query = db.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    return unwrap(await query) || [];
  },
};

export const EmailBroadcastModel = {
  async create(db, row) {
    return unwrap(await db.from("email_broadcasts").insert([row]).select().single());
  },

  async update(db, id, updates) {
    return unwrap(await db.from("email_broadcasts").update(updates).eq("id", id).select().maybeSingle());
  },

  async list(db, { limit = 20 } = {}) {
    return unwrap(await db.from("email_broadcasts").select("*").order("created_at", { ascending: false }).limit(limit)) || [];
  },
};

export const EmailLogModel = {
  async insert(db, row) {
    // Logging must never break delivery.
    try {
      await db.from("email_logs").insert([row]);
    } catch {
      /* ignore */
    }
  },

  async list(db, { limit = 100, broadcastId } = {}) {
    let query = db.from("email_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (broadcastId) query = query.eq("broadcast_id", broadcastId);
    return unwrap(await query) || [];
  },
};
