import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, unwrap } from "../utils/ApiError.js";
import { pick } from "../utils/object.js";
import { TeacherModel } from "../models/teacher.model.js";
import { InstituteModel } from "../models/institute.model.js";
import { VacancyModel } from "../models/vacancy.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { PaymentModel } from "../models/payment.model.js";
import {
  FormFieldModel,
  PaymentLinkModel,
  SettingModel,
  AuditLogModel,
  InquiryModel,
  AdminActionModel,
} from "../models/cms.model.js";
import { NotificationService } from "../services/notification.service.js";
import { EmailService } from "../services/email/email.service.js";

const ENTITY = { teachers: "TEACHER", institutes: "INSTITUTE" };
const VERIFICATION_STATUSES = ["Pending", "Under Review", "Verified", "Rejected", "Suspended"];

const entityFromParams = (req) => {
  const entityType = ENTITY[req.params.entity];
  if (!entityType) throw ApiError.notFound();
  return entityType;
};

const rpc = async (db, fn, params) => unwrap(await db.rpc(fn, params));

const countRows = async (db, table) => {
  const { count } = await db.from(table).select("id", { count: "exact", head: true });
  return count || 0;
};

export const AdminController = {
  stats: asyncHandler(async (req, res) => {
    const [teachers, institutes, vacancies, applications, articles, paymentLinks, payments] = await Promise.all([
      countRows(req.db, "teachers"),
      countRows(req.db, "institutes"),
      countRows(req.db, "vacancies"),
      countRows(req.db, "applications"),
      countRows(req.db, "blog_posts"),
      countRows(req.db, "payment_links"),
      PaymentModel.listAll(req.db),
    ]);
    const captured = payments.filter((p) => p.status === "CAPTURED");
    res.json({
      success: true,
      data: {
        totalTeachers: teachers,
        totalInstitutes: institutes,
        totalVacancies: vacancies,
        totalApplications: applications,
        totalArticles: articles,
        totalPaymentLinks: paymentLinks,
        totalRevenue: captured.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        capturedPayments: captured.length,
      },
    });
  }),

  // ---- Teachers & institutes ----
  listTeachers: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await TeacherModel.listAll(req.db, req.query) });
  }),

  listInstitutes: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await InstituteModel.list(req.db) });
  }),

  createTeacher: asyncHandler(async (req, res) => {
    if (!req.body.name) throw ApiError.badRequest("Please enter the teacher's name.");
    const data = await rpc(req.db, "admin_create_teacher", { p_data: req.body });
    res.status(201).json({ success: true, data });
  }),

  createInstitute: asyncHandler(async (req, res) => {
    if (!req.body.institute_name && !req.body.name) throw ApiError.badRequest("Please enter the institute name.");
    const data = await rpc(req.db, "admin_create_institute", { p_data: req.body });
    res.status(201).json({ success: true, data });
  }),

  updateEntity: asyncHandler(async (req, res) => {
    const entityType = entityFromParams(req);
    const Model = entityType === "TEACHER" ? TeacherModel : InstituteModel;
    // Verification and unlock state go through their dedicated actions.
    const updates = { ...req.body };
    ["id", "email", "verified", "verification_status", "unlocked_teachers", "created_at"].forEach((k) => delete updates[k]);
    const row = await Model.update(req.db, req.params.id, updates);
    if (!row) throw ApiError.notFound();
    res.json({ success: true, data: row });
  }),

  verifyEntity: asyncHandler(async (req, res) => {
    const entityType = entityFromParams(req);
    const { status, reason = null, notes = null } = req.body;
    if (!VERIFICATION_STATUSES.includes(status)) throw ApiError.badRequest("Invalid verification status.");

    const data = await rpc(req.db, "admin_verify_profile", {
      p_entity_type: entityType,
      p_entity_id: req.params.id,
      p_status: status,
      p_reason: reason,
      p_notes: notes,
    });

    if (status === "Verified" || status === "Rejected") {
      const approved = status === "Verified";
      await NotificationService.notify({
        userId: req.params.id,
        title: approved ? "🎉 KYC Verification Approved!" : "⚠️ KYC Verification Update",
        message: approved
          ? "Your credentials have been verified by EduHire Bridge."
          : `Your KYC submission was reviewed and rejected.${reason ? ` Reason: ${reason}` : " Please update your credentials."}`,
        type: "KYC",
      });
      EmailService.background(
        EmailService.sendToUser(req.params.id, "verificationDecision", { approved, reason }, { preference: null })
      );
    }
    res.json({ success: true, data });
  }),

  featureEntity: asyncHandler(async (req, res) => {
    const data = await rpc(req.db, "admin_feature_profile", {
      p_entity_type: entityFromParams(req),
      p_entity_id: req.params.id,
      p_feature: Boolean(req.body.feature),
    });
    res.json({ success: true, data });
  }),

  archiveEntity: asyncHandler(async (req, res) => {
    const data = await rpc(req.db, "admin_archive_profile", {
      p_entity_type: entityFromParams(req),
      p_entity_id: req.params.id,
      p_archive: Boolean(req.body.archive),
    });
    res.json({ success: true, data });
  }),

  flagEntity: asyncHandler(async (req, res) => {
    const data = await rpc(req.db, "admin_flag_profile", {
      p_entity_type: entityFromParams(req),
      p_entity_id: req.params.id,
      p_flagged: Boolean(req.body.flagged),
      p_notes: req.body.notes || null,
    });
    res.json({ success: true, data });
  }),

  deleteEntity: asyncHandler(async (req, res) => {
    const data = await rpc(req.db, "admin_delete_profile", {
      p_entity_type: entityFromParams(req),
      p_entity_id: req.params.id,
      p_permanent: req.query.permanent === "true",
    });
    res.json({ success: true, data });
  }),

  auditLogs: asyncHandler(async (req, res) => {
    const logs = await AuditLogModel.list(req.db, { entityType: req.query.entityType, entityId: req.query.entityId });
    res.json({ success: true, data: logs });
  }),

  // ---- Vacancies, applications & matchmaking ----
  listVacancies: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await VacancyModel.list(req.db) });
  }),

  listApplications: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await ApplicationModel.list(req.db) });
  }),

  /** Mediator recommendation: tells the institute about a teacher and the teacher about the vacancy. */
  matchmake: asyncHandler(async (req, res) => {
    const { vacancyId, teacherId, note } = req.body;
    if (!vacancyId || !teacherId) throw ApiError.badRequest("Please select both a vacancy and a teacher.");

    const [vacancy, teacher] = await Promise.all([
      VacancyModel.findById(req.db, vacancyId),
      TeacherModel.findById(req.db, teacherId),
    ]);
    if (!vacancy) throw ApiError.notFound("Vacancy not found.");
    if (!teacher) throw ApiError.notFound("Teacher not found.");

    const extra = note ? ` Note from EduHire: ${note}` : "";
    await Promise.all([
      NotificationService.notify({
        userId: vacancy.institute_id,
        title: "Mediator Recommendation",
        message: `EduHire recommends ${teacher.name} (${teacher.primary_subject || "Faculty"}) for "${vacancy.title}".${extra}`,
        type: "MATCH",
        link: "/institute/talent",
      }),
      NotificationService.notify({
        userId: teacher.id,
        title: "You've been recommended for a vacancy",
        message: `EduHire recommended you to ${vacancy.institute_name} for "${vacancy.title}". Apply from Explore Vacancies.${extra}`,
        type: "MATCH",
        link: "/teacher/jobs",
      }),
    ]);

    EmailService.background(
      EmailService.sendToUser(
        vacancy.institute_id,
        "matchRecommendation",
        { message: `EduHire recommends ${teacher.name} (${teacher.primary_subject || "Faculty"}) for "${vacancy.title}".${extra}`, path: "/institute/talent" },
        { preference: "email_notifications_enabled" }
      )
    );
    EmailService.background(
      EmailService.sendToUser(
        teacher.id,
        "matchRecommendation",
        { message: `EduHire recommended you to ${vacancy.institute_name} for "${vacancy.title}".${extra}`, path: `/careers/${vacancy.id}` },
        { preference: "employer_interest_enabled" }
      )
    );

    await AdminActionModel.log(req.db, {
      adminId: req.user.id,
      actionType: "MATCHMAKE",
      targetId: vacancy.id,
      targetType: "VACANCY",
      details: { teacherId: teacher.id },
    });

    res.json({ success: true, message: "Mediator recommendation dispatched to institute!" });
  }),

  broadcast: asyncHandler(async (req, res) => {
    const { targetRole, title, message, link = "" } = req.body;
    if (!message || !String(message).trim()) throw ApiError.badRequest("Please type an announcement message.");

    const roleMap = { TEACHER: ["TEACHER"], INSTITUTE: ["INSTITUTE"], ALL: ["TEACHER", "INSTITUTE"] };
    const roles = roleMap[String(targetRole || "").toUpperCase()];
    if (!roles) throw ApiError.badRequest("Invalid target audience.");

    const count = await NotificationService.broadcast({
      roles,
      title: title?.trim() || "Announcement from EduHire Bridge",
      message: String(message).trim(),
      link,
    });

    await AdminActionModel.log(req.db, {
      adminId: req.user.id,
      actionType: "BROADCAST",
      targetId: targetRole,
      targetType: "ROLE",
      details: { count },
    });

    res.json({ success: true, data: { count } });
  }),

  // ---- Finance ----
  payments: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await PaymentModel.listAll(req.db) });
  }),

  // ---- CMS: form fields, payment links, settings, inquiries ----
  listFormFields: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await FormFieldModel.listByType(req.db, req.query.type) });
  }),
  createFormField: asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await FormFieldModel.create(req.db, req.body) });
  }),
  updateFormField: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await FormFieldModel.update(req.db, req.params.id, req.body) });
  }),
  deleteFormField: asyncHandler(async (req, res) => {
    await FormFieldModel.remove(req.db, req.params.id);
    res.json({ success: true });
  }),

  listPaymentLinks: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await PaymentLinkModel.list(req.db) });
  }),
  createPaymentLink: asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await PaymentLinkModel.create(req.db, req.body) });
  }),
  updatePaymentLink: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await PaymentLinkModel.update(req.db, req.params.id, req.body) });
  }),
  deletePaymentLink: asyncHandler(async (req, res) => {
    await PaymentLinkModel.remove(req.db, req.params.id);
    res.json({ success: true });
  }),

  updateSetting: asyncHandler(async (req, res) => {
    if (req.body.value === undefined) throw ApiError.badRequest("Missing setting value.");
    const row = await SettingModel.upsert(req.db, req.params.key, req.body.value, req.body.description || "");
    res.json({ success: true, data: row });
  }),

  inquiries: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await InquiryModel.list(req.db) });
  }),

  updateInquiry: asyncHandler(async (req, res) => {
    const row = await InquiryModel.update(req.db, req.params.id, pick(req.body, ["status"]));
    res.json({ success: true, data: row });
  }),
};
