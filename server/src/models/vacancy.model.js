import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";
import { escapeFilter } from "../utils/normalize.js";

const base = createBaseModel("vacancies");

export const VacancyModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  /** Public job board: active vacancies with optional filters. */
  async listActive(db, filters = {}) {
    let query = db.from("vacancies").select("*").eq("status", "Active");
    const subject = escapeFilter(filters.subject);
    const city = escapeFilter(filters.city);
    const search = escapeFilter(filters.search);
    const level = escapeFilter(filters.level);

    if (subject) query = query.ilike("subject", `%${subject}%`);
    if (city) query = query.ilike("city", `%${city}%`);
    if (search) query = query.or(`title.ilike.%${search}%,institute_name.ilike.%${search}%,subject.ilike.%${search}%`);
    if (level) query = query.or(`title.ilike.%${level}%,board.ilike.%${level}%,classes.cs.{${level}}`);
    if (filters.urgency) query = query.eq("urgency", filters.urgency);

    const limit = Number(filters.limit) || 200;
    return unwrap(await query.order("created_at", { ascending: false }).limit(limit)) || [];
  },

  async listByInstitute(db, instituteId) {
    return (
      unwrap(
        await db.from("vacancies").select("*").eq("institute_id", instituteId).order("created_at", { ascending: false })
      ) || []
    );
  },

  async countActive(db) {
    const { count } = await db.from("vacancies").select("id", { count: "exact", head: true }).eq("status", "Active");
    return count || 0;
  },
};
