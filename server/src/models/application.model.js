import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const base = createBaseModel("applications");

export const APPLICATION_STATUSES = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "REJECTED",
  "WITHDRAWN",
];

const listBy = async (db, column, value) =>
  unwrap(await db.from("applications").select("*").eq(column, value).order("created_at", { ascending: false })) || [];

export const ApplicationModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  listByTeacher: (db, teacherId) => listBy(db, "teacher_id", teacherId),
  listByInstitute: (db, instituteId) => listBy(db, "institute_id", instituteId),
};
