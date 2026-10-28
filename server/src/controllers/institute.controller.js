import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/object.js";
import { serviceDb } from "../config/supabase.js";
import { InstituteModel } from "../models/institute.model.js";
import { TeacherModel } from "../models/teacher.model.js";
import { ProfileModel } from "../models/profile.model.js";
import { AuthService } from "../services/auth.service.js";
import { StorageService } from "../services/storage.service.js";

/** Fields an institute may change. Verification, plan and the unlocked list are protected. */
const INSTITUTE_EDITABLE = [
  "institute_name",
  "tagline",
  "contact_person",
  "designation",
  "poc_name",
  "poc_designation",
  "phone",
  "website",
  "location",
  "city",
  "state",
  "institute_type",
  "boards",
  "facilities",
  "student_count",
  "faculty_count",
  "established_year",
  "branches_count",
  "courses",
  "description",
  "profile_visibility",
  "custom_fields",
  "email_notifications_enabled",
  "marketing_emails_enabled",
];

/** Adds signed resume links to unlocked teachers. Access already checked by the caller. */
const withResumeLinks = (teachers) =>
  Promise.all(
    teachers.map(async (teacher) => ({
      ...teacher,
      resume_url: teacher.resume_url ? await StorageService.resolveUrl(serviceDb, "resumes", teacher.resume_url) : "",
      profile_photo_url: teacher.profile_photo_url
        ? await StorageService.resolveUrl(serviceDb, "avatars", teacher.profile_photo_url)
        : "",
    }))
  );

export const InstituteController = {
  updateMe: asyncHandler(async (req, res) => {
    const updates = pick(req.body, INSTITUTE_EDITABLE);
    if (updates.institute_name !== undefined && String(updates.institute_name).trim().length < 2) {
      throw ApiError.badRequest("Please enter the institute name.");
    }

    await InstituteModel.update(req.db, req.user.id, updates);

    const profileUpdates = {};
    if (updates.institute_name) profileUpdates.name = updates.institute_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.city !== undefined) profileUpdates.city = updates.city;
    if (updates.state !== undefined) profileUpdates.state = updates.state;
    if (Object.keys(profileUpdates).length > 0) await ProfileModel.update(req.db, req.user.id, profileUpdates);

    res.json({ success: true, data: await AuthService.buildCurrentUser(req.auth.user) });
  }),

  /**
   * Talent discovery: public teacher profiles, plus contact details for the
   * teachers this institute has unlocked.
   */
  talent: asyncHandler(async (req, res) => {
    const [teachers, unlockedIds] = await Promise.all([
      TeacherModel.listPublic(serviceDb, req.query),
      InstituteModel.getUnlockedIds(serviceDb, req.user.id),
    ]);

    const contacts = await TeacherModel.findContactsByIds(
      serviceDb,
      teachers.filter((t) => unlockedIds.includes(t.id)).map((t) => t.id)
    );
    const contactById = Object.fromEntries(contacts.map((c) => [c.id, c]));

    const data = teachers.map((teacher) => {
      const contact = contactById[teacher.id];
      return {
        ...teacher,
        is_unlocked: Boolean(contact),
        phone: contact?.phone || null,
        email: contact?.email || null,
      };
    });
    res.json({ success: true, data, meta: { unlockedIds } });
  }),

  unlocked: asyncHandler(async (req, res) => {
    const ids = await InstituteModel.getUnlockedIds(serviceDb, req.user.id);
    const teachers = await TeacherModel.findContactsByIds(serviceDb, ids);
    res.json({ success: true, data: await withResumeLinks(teachers) });
  }),
};
