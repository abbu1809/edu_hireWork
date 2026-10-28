import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const base = createBaseModel("profiles");

export const ProfileModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  async listIdsByRole(db, role) {
    const rows = unwrap(await db.from("profiles").select("id").eq("role", role)) || [];
    return rows.map((row) => row.id);
  },

  async countAdmins(db) {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ADMIN");
    return count || 0;
  },
};
