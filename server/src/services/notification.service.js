import { serviceDb } from "../config/supabase.js";
import { NotificationModel } from "../models/notification.model.js";
import { ProfileModel } from "../models/profile.model.js";

/**
 * Notifications are written with service privileges because the API has
 * already authorized the action that triggers them.
 */
export const NotificationService = {
  async notify({ userId, title, message, type = "INFO", link = "" }) {
    if (!userId) return;
    try {
      await NotificationModel.insertMany(serviceDb, [{ user_id: userId, title, message, type, link }]);
    } catch (err) {
      // A failed notification must never fail the main action.
      console.warn("Notification not delivered:", err.message);
    }
  },

  /** Sends one notification to every user with the given role(s). Returns the count. */
  async broadcast({ roles, title, message, type = "SYSTEM", link = "" }) {
    const ids = (await Promise.all(roles.map((role) => ProfileModel.listIdsByRole(serviceDb, role)))).flat();
    const rows = [...new Set(ids)].map((userId) => ({ user_id: userId, title, message, type, link }));
    return NotificationModel.insertMany(serviceDb, rows);
  },
};
