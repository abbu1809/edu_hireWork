import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const base = createBaseModel("institutes");

export const InstituteModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  async listPublic(db, { featured } = {}) {
    let query = db.from("public_institutes").select("*");
    if (featured === true || featured === "true") query = query.eq("featured_on_homepage", true);
    return unwrap(await query.order("created_at", { ascending: false })) || [];
  },

  async countPublic(db) {
    const { count } = await db.from("public_institutes").select("id", { count: "exact", head: true });
    return count || 0;
  },

  async getUnlockedIds(db, instituteId) {
    const row = unwrap(await db.from("institutes").select("unlocked_teachers").eq("id", instituteId).maybeSingle());
    return row?.unlocked_teachers || [];
  },

  /** Adds a teacher to the institute's unlocked list. Requires service privileges. */
  async addUnlockedTeacher(serviceDb, instituteId, teacherId) {
    const current = await this.getUnlockedIds(serviceDb, instituteId);
    if (current.includes(teacherId)) return current;
    const next = [...current, teacherId];
    unwrap(
      await serviceDb
        .from("institutes")
        .update({ unlocked_teachers: next, updated_at: new Date().toISOString() })
        .eq("id", instituteId)
    );
    return next;
  },
};
