import { unwrap } from "../utils/ApiError.js";

export const NotificationModel = {
  async listByUser(db, userId, { limit = 50 } = {}) {
    return (
      unwrap(
        await db
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)
      ) || []
    );
  },

  async markRead(db, userId, id) {
    return unwrap(
      await db.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId).select().maybeSingle()
    );
  },

  async markAllRead(db, userId) {
    unwrap(await db.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false));
    return true;
  },

  /** Inserts many notifications at once. Requires service privileges. */
  async insertMany(serviceDb, rows) {
    if (rows.length === 0) return 0;
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      unwrap(await serviceDb.from("notifications").insert(rows.slice(i, i + chunkSize)));
    }
    return rows.length;
  },
};
