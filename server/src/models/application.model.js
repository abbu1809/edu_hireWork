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

export const APPLICATION_STATUS_ORDER = {
  APPLIED: 0,
  UNDER_REVIEW: 1,
  SHORTLISTED: 2,
  INTERVIEW: 3,
  SELECTED: 4,
  REJECTED: 4,
  WITHDRAWN: 4,
};

export const TERMINAL_APPLICATION_STATUSES = ["SELECTED", "REJECTED", "WITHDRAWN"];

/**
 * Forward-only ATS status transitions. Once an application moves forward (e.g.
 * Shortlisted) it cannot backtrack to an earlier stage (Applied / Under Review),
 * and once finalized (Selected / Rejected / Withdrawn) it cannot be changed.
 */
export const canTransitionApplicationStatus = (fromStatus, toStatus) => {
  const from = fromStatus || "APPLIED";
  if (from === toStatus) return false;
  if (TERMINAL_APPLICATION_STATUSES.includes(from)) return false;
  if (toStatus === "REJECTED") return true;
  const fromRank = APPLICATION_STATUS_ORDER[from];
  const toRank = APPLICATION_STATUS_ORDER[toStatus];
  if (fromRank === undefined || toRank === undefined) return false;
  return toRank > fromRank;
};

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
