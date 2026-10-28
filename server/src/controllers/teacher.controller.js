import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/object.js";
import { anonDb } from "../config/supabase.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import { TeacherModel } from "../models/teacher.model.js";
import { ProfileModel } from "../models/profile.model.js";
import { AuthService } from "../services/auth.service.js";

/** Fields a teacher may change on their own record. Verification, badges and ratings are admin-only. */
const TEACHER_EDITABLE = [
  "name",
  "phone",
  "qualification",
  "experience_years",
  "subjects",
  "classes_taught",
  "city",
  "state",
  "current_location",
  "willing_to_relocate",
  "languages",
  "gender",
  "dob",
  "primary_role",
  "secondary_roles",
  "headline",
  "primary_subject",
  "secondary_subjects",
  "specialization",
  "specializations",
  "exam_categories",
  "experience_range",
  "exam_prep_experience_years",
  "current_organization",
  "current_designation",
  "previous_organizations",
  "work_history",
  "education_records",
  "work_modes",
  "preferred_location",
  "preferred_cities",
  "availability",
  "employment_types",
  "target_levels",
  "salary_currency",
  "salary_period",
  "min_expected_salary",
  "preferred_salary",
  "expected_salary_min",
  "expected_salary_preferred",
  "is_salary_negotiable",
  "bio",
  "expected_ctc",
  "teaching_mode",
  "demo_video_url",
  "custom_fields",
  "references",
];

const PREFERENCE_FIELDS = [
  "profile_visibility",
  "job_alerts_enabled",
  "application_updates_enabled",
  "employer_interest_enabled",
  "interview_notifications_enabled",
  "marketing_emails_enabled",
];

const PROFILE_FIELDS = ["name", "phone", "city", "state"];

export const TeacherController = {
  /** Public faculty directory (safe fields only). */
  listPublic: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await TeacherModel.listPublic(anonDb, req.query) });
  }),

  getPublic: asyncHandler(async (req, res) => {
    const teacher = await TeacherModel.findPublicById(anonDb, req.params.id);
    if (!teacher) throw ApiError.notFound("This faculty profile is not available.");
    res.json({ success: true, data: teacher });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const updates = pick(req.body, TEACHER_EDITABLE);

    if (updates.experience_years !== undefined) {
      const years = Number(updates.experience_years);
      if (Number.isNaN(years) || years < 0 || years > 60) throw ApiError.badRequest("Please enter valid experience in years.");
      updates.experience_years = years;
    }
    if (updates.primary_subject && (!Array.isArray(updates.subjects) || updates.subjects.length === 0)) {
      const current = await TeacherModel.findById(req.db, req.user.id);
      const existing = current?.subjects || [];
      updates.subjects = existing.includes(updates.primary_subject) ? existing : [updates.primary_subject, ...existing];
    }
    if (updates.city && !updates.preferred_location) updates.preferred_location = updates.city;

    const profileUpdates = pick(updates, PROFILE_FIELDS);
    if (Object.keys(profileUpdates).length > 0) {
      await ProfileModel.update(req.db, req.user.id, profileUpdates);
    }

    const current = (await TeacherModel.findById(req.db, req.user.id)) || {};
    const percent = calculateProfileCompletion({ ...current, ...updates }).percent;
    updates.profile_completion_percent = percent;
    updates.profile_completion_percentage = percent;

    await TeacherModel.update(req.db, req.user.id, updates);
    const user = await AuthService.buildCurrentUser(req.auth.user);
    res.json({ success: true, data: user });
  }),

  getPreferences: asyncHandler(async (req, res) => {
    const teacher = await TeacherModel.findById(req.db, req.user.id);
    res.json({ success: true, data: pick(teacher || {}, PREFERENCE_FIELDS) });
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    const updates = pick(req.body, PREFERENCE_FIELDS);
    if (updates.profile_visibility && !["PUBLIC_VERIFIED_EMPLOYERS", "HIDDEN"].includes(updates.profile_visibility)) {
      throw ApiError.badRequest("Invalid profile visibility option.");
    }
    const teacher = await TeacherModel.update(req.db, req.user.id, updates);
    res.json({ success: true, data: pick(teacher || {}, PREFERENCE_FIELDS) });
  }),
};
