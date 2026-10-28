import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { isValidEmail } from "../utils/normalize.js";
import { anonDb, serviceDb } from "../config/supabase.js";
import { TeacherModel } from "../models/teacher.model.js";
import { InstituteModel } from "../models/institute.model.js";
import { VacancyModel } from "../models/vacancy.model.js";
import { SettingModel, PaymentLinkModel, FormFieldModel, InquiryModel } from "../models/cms.model.js";
import { config } from "../config/env.js";
import { EmailService } from "../services/email/email.service.js";

export const PublicController = {
  health: (req, res) => {
    res.json({ success: true, data: { status: "ok", service: "EduHire Bridge API", timestamp: new Date().toISOString() } });
  },

  /** Live platform counters shown on the landing page. */
  stats: asyncHandler(async (req, res) => {
    const [teachers, institutes, vacancies] = await Promise.all([
      TeacherModel.countPublic(serviceDb),
      InstituteModel.countPublic(serviceDb),
      VacancyModel.countActive(serviceDb),
    ]);
    res.json({ success: true, data: { teachers, institutes, vacancies } });
  }),

  settings: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await SettingModel.getMap(anonDb) });
  }),

  paymentLinks: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await PaymentLinkModel.listActive(anonDb) });
  }),

  formFields: asyncHandler(async (req, res) => {
    const fields = await FormFieldModel.listByType(anonDb, req.query.type);
    res.json({ success: true, data: fields });
  }),

  featuredInstitutes: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await InstituteModel.listPublic(anonDb, { featured: req.query.featured }) });
  }),

  contact: asyncHandler(async (req, res) => {
    const { name, email, role, message } = req.body;
    if (!name || !message) throw ApiError.badRequest("Please enter your name and message.");
    if (!isValidEmail(email)) throw ApiError.badRequest("Please enter a valid email address.");

    const inquiry = await InquiryModel.create(serviceDb, {
      name: String(name).trim().slice(0, 200),
      email: String(email).trim().toLowerCase(),
      role: role ? String(role).slice(0, 50) : null,
      message: String(message).trim().slice(0, 5000),
    });
    EmailService.background(EmailService.send(inquiry.email, "inquiryAck", { name: inquiry.name }));
    if (config.email.adminNotifyEmail) {
      EmailService.background(
        EmailService.send(config.email.adminNotifyEmail, "inquiryAdmin", {
          name: inquiry.name,
          email: inquiry.email,
          role: inquiry.role,
          message: inquiry.message,
        })
      );
    }
    res.status(201).json({ success: true, data: { id: inquiry.id } });
  }),
};
