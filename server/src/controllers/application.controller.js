import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { anonDb } from "../config/supabase.js";
import { ApplicationModel, APPLICATION_STATUSES } from "../models/application.model.js";
import { VacancyModel } from "../models/vacancy.model.js";
import { TeacherModel } from "../models/teacher.model.js";
import { NotificationService } from "../services/notification.service.js";
import { EmailService } from "../services/email/email.service.js";

const STATUS_LABELS = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview / Demo",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const ApplicationController = {
  listMine: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await ApplicationModel.listByTeacher(req.db, req.user.id) });
  }),

  listReceived: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await ApplicationModel.listByInstitute(req.db, req.user.id) });
  }),

  apply: asyncHandler(async (req, res) => {
    const { vacancyId } = req.body;
    if (!vacancyId) throw ApiError.badRequest("Please choose a vacancy to apply for.");

    const vacancy = await VacancyModel.findById(anonDb, vacancyId);
    if (!vacancy || vacancy.status !== "Active") throw ApiError.notFound("This vacancy is no longer accepting applications.");

    const teacher = await TeacherModel.findById(req.db, req.user.id);
    let application;
    try {
      application = await ApplicationModel.create(req.db, {
        vacancy_id: vacancy.id,
        vacancy_title: vacancy.title,
        institute_id: vacancy.institute_id,
        institute_name: vacancy.institute_name,
        teacher_id: req.user.id,
        teacher_name: teacher?.name || req.user.name,
        status: "APPLIED",
        resume_url: teacher?.resume_url || null,
      });
    } catch (err) {
      if (err.statusCode === 409) throw ApiError.conflict("You have already applied for this vacancy.");
      throw err;
    }

    await NotificationService.notify({
      userId: vacancy.institute_id,
      title: "New Job Application Received",
      message: `${application.teacher_name} applied for "${vacancy.title}"`,
      type: "APPLICATION",
      link: "/institute/applicants",
    });
    EmailService.background(
      EmailService.sendToUser(
        vacancy.institute_id,
        "applicationReceived",
        { instituteName: vacancy.institute_name, teacherName: application.teacher_name, vacancyTitle: vacancy.title },
        { preference: "email_notifications_enabled" }
      )
    );

    res.status(201).json({ success: true, data: application });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!APPLICATION_STATUSES.includes(status) || status === "WITHDRAWN") {
      throw ApiError.badRequest("Invalid application status.");
    }

    const application = await ApplicationModel.update(req.db, req.params.id, { status });
    if (!application) throw ApiError.notFound("Application not found.");

    await NotificationService.notify({
      userId: application.teacher_id,
      title: `Application Status Updated: ${STATUS_LABELS[status]}`,
      message: `Your application for "${application.vacancy_title}" at ${application.institute_name} is now: ${STATUS_LABELS[status]}`,
      type: "APPLICATION",
      link: "/teacher/applications",
    });
    EmailService.background(
      EmailService.sendToUser(
        application.teacher_id,
        "applicationStatus",
        { vacancyTitle: application.vacancy_title, instituteName: application.institute_name, statusLabel: STATUS_LABELS[status] },
        { preference: "application_updates_enabled" }
      )
    );

    res.json({ success: true, data: application });
  }),

  withdraw: asyncHandler(async (req, res) => {
    const application = await ApplicationModel.update(req.db, req.params.id, { status: "WITHDRAWN" });
    if (!application) throw ApiError.notFound("Application not found.");
    res.json({ success: true, data: application });
  }),
};
