import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/object.js";
import { anonDb } from "../config/supabase.js";
import { VacancyModel } from "../models/vacancy.model.js";
import { InstituteModel } from "../models/institute.model.js";
import { JobAlertService } from "../services/email/jobAlert.service.js";

const EDITABLE_FIELDS = [
  "title",
  "subject",
  "city",
  "location",
  "classes",
  "board",
  "salary_range",
  "min_experience",
  "type",
  "description",
  "status",
  "urgency",
];

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim()).filter(Boolean);
  return undefined;
};

const cleanPayload = (body) => {
  const payload = pick(body, EDITABLE_FIELDS);
  if (payload.classes !== undefined) payload.classes = toArray(payload.classes) || [];
  Object.keys(payload).forEach((key) => {
    if (typeof payload[key] === "string") payload[key] = payload[key].trim();
  });
  return payload;
};

export const VacancyController = {
  /** Public job board. */
  listActive: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await VacancyModel.listActive(anonDb, req.query) });
  }),

  getById: asyncHandler(async (req, res) => {
    const db = req.db || anonDb;
    const vacancy = await VacancyModel.findById(db, req.params.id);
    if (!vacancy) throw ApiError.notFound("This vacancy is no longer available.");
    res.json({ success: true, data: vacancy });
  }),

  listMine: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await VacancyModel.listByInstitute(req.db, req.user.id) });
  }),

  create: asyncHandler(async (req, res) => {
    const payload = cleanPayload(req.body);
    if (!payload.title) throw ApiError.badRequest("Please enter a vacancy title.");
    if (!payload.subject) throw ApiError.badRequest("Please choose a subject.");
    if (!payload.city) throw ApiError.badRequest("Please enter the city.");
    if (!payload.salary_range) throw ApiError.badRequest("Please enter a salary range.");

    const institute = await InstituteModel.findById(req.db, req.user.id);
    const vacancy = await VacancyModel.create(req.db, {
      ...payload,
      institute_id: req.user.id,
      institute_name: institute?.institute_name || req.user.name,
    });
    JobAlertService.notifyMatchingTeachers(vacancy).catch((err) => console.warn("[email] job alerts failed:", err.message));
    res.status(201).json({ success: true, data: vacancy });
  }),

  update: asyncHandler(async (req, res) => {
    const vacancy = await VacancyModel.update(req.db, req.params.id, cleanPayload(req.body));
    if (!vacancy) throw ApiError.notFound("Vacancy not found.");
    res.json({ success: true, data: vacancy });
  }),

  remove: asyncHandler(async (req, res) => {
    await VacancyModel.remove(req.db, req.params.id);
    res.json({ success: true, message: "Vacancy removed." });
  }),
};
