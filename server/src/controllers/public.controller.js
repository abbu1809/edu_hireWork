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
import { cache } from "../utils/cache.js";

const setPublicCache = (res, seconds = 15) => {
  res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
};

export const PublicController = {
  health: (req, res) => {
    res.json({ success: true, data: { status: "ok", service: "FacultyKart API", timestamp: new Date().toISOString() } });
  },

  /** Live platform counters shown on the landing page. */
  stats: asyncHandler(async (req, res) => {
    const data = await cache.remember("public:stats", 30_000, async () => {
      const [teachers, institutes, vacancies] = await Promise.all([
        TeacherModel.countPublic(serviceDb),
        InstituteModel.countPublic(serviceDb),
        VacancyModel.countActive(serviceDb),
      ]);
      return { teachers, institutes, vacancies };
    });
    setPublicCache(res, 15);
    res.json({ success: true, data });
  }),

  settings: asyncHandler(async (req, res) => {
    const data = await cache.remember("public:settings:map", 30_000, () => SettingModel.getMap(anonDb));
    setPublicCache(res, 15);
    res.json({ success: true, data });
  }),

  paymentLinks: asyncHandler(async (req, res) => {
    const data = await cache.remember("public:payment-links", 60_000, () => PaymentLinkModel.listActive(anonDb));
    setPublicCache(res, 30);
    res.json({ success: true, data });
  }),

  formFields: asyncHandler(async (req, res) => {
    const type = req.query.type || "all";
    const data = await cache.remember(`public:form-fields:${type}`, 60_000, () =>
      FormFieldModel.listByType(anonDb, req.query.type)
    );
    setPublicCache(res, 30);
    res.json({ success: true, data });
  }),

  featuredInstitutes: asyncHandler(async (req, res) => {
    const featured = req.query.featured ?? "all";
    const data = await cache.remember(`public:institutes:${featured}`, 30_000, () =>
      InstituteModel.listPublic(anonDb, { featured: req.query.featured })
    );
    setPublicCache(res, 15);
    res.json({ success: true, data });
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
