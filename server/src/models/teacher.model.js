import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";
import { escapeFilter } from "../utils/normalize.js";

const base = createBaseModel("teachers");

/** Columns an institute sees after paying to unlock a teacher. */
const CONTACT_COLUMNS =
  "id, name, email, phone, qualification, primary_subject, subjects, experience_years, city, preferred_location, expected_ctc, resume_url, resume_name, profile_photo_url, verified";

const applyFilters = (query, filters = {}) => {
  const subject = escapeFilter(filters.subject);
  const city = escapeFilter(filters.city);
  const search = escapeFilter(filters.search);

  if (subject) {
    query = query.or(`subjects.cs.{${subject}},primary_subject.ilike.%${subject}%,specialization.ilike.%${subject}%`);
  }
  if (city) query = query.or(`city.ilike.%${city}%,preferred_location.ilike.%${city}%`);
  if (search) query = query.or(`name.ilike.%${search}%,headline.ilike.%${search}%,primary_subject.ilike.%${search}%`);
  if (filters.minExp) query = query.gte("experience_years", Number(filters.minExp));
  if (filters.verifiedOnly === true || filters.verifiedOnly === "true") query = query.eq("verified", true);
  if (filters.featured === true || filters.featured === "true") query = query.eq("featured_on_homepage", true);
  return query;
};

export const TeacherModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  /** Full rows from the protected base table (admin, or the teacher themself). */
  async listAll(db, filters = {}) {
    const query = applyFilters(db.from("teachers").select("*"), filters);
    return unwrap(await query.order("created_at", { ascending: false })) || [];
  },

  /** Safe professional profiles only — no phone, email, resume or KYC. */
  async listPublic(db, filters = {}) {
    const query = applyFilters(db.from("public_teachers").select("*"), filters);
    const limit = Number(filters.limit) || 200;
    return unwrap(await query.order("rating", { ascending: false }).limit(limit)) || [];
  },

  async findPublicById(db, id) {
    return unwrap(await db.from("public_teachers").select("*").eq("id", id).maybeSingle());
  },

  async findContactsByIds(db, ids = []) {
    if (ids.length === 0) return [];
    return unwrap(await db.from("teachers").select(CONTACT_COLUMNS).in("id", ids)) || [];
  },

  async countPublic(db) {
    const { count } = await db.from("public_teachers").select("id", { count: "exact", head: true });
    return count || 0;
  },
};
