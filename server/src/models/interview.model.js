import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const base = createBaseModel("interviews", { orderBy: "scheduled_at", ascending: true });

const listBy = async (db, column, value) =>
  unwrap(await db.from("interviews").select("*").eq(column, value).order("scheduled_at", { ascending: true })) || [];

export const InterviewModel = {
  ...base,
  listByTeacher: (db, teacherId) => listBy(db, "teacher_id", teacherId),
  listByInstitute: (db, instituteId) => listBy(db, "institute_id", instituteId),
};
