import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { DocumentModel, DOCUMENT_TYPES } from "../models/document.model.js";
import { TeacherModel } from "../models/teacher.model.js";
import { ProfileModel } from "../models/profile.model.js";
import { StorageService, bucketForDocumentType, BUCKETS } from "../services/storage.service.js";
import { AuthService } from "../services/auth.service.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const DocumentController = {
  listMine: asyncHandler(async (req, res) => {
    const docs = await DocumentModel.listByUser(req.db, req.user.id);
    res.json({ success: true, data: docs });
  }),

  /** Uploads a file to storage, records it, and links resumes/photos to the teacher profile. */
  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file selected.");
    const documentType = String(req.body.documentType || "CERTIFICATE").toUpperCase();
    if (!DOCUMENT_TYPES.includes(documentType)) throw ApiError.badRequest("Invalid document type.");

    const bucket = bucketForDocumentType(documentType);
    if (bucket === BUCKETS.AVATARS && !IMAGE_TYPES.includes(req.file.mimetype)) {
      throw ApiError.badRequest("Profile photos must be JPG, PNG or WEBP images.");
    }
    if (bucket === BUCKETS.AVATARS && req.file.size > 5 * 1024 * 1024) {
      throw ApiError.badRequest("Profile photos must be 5MB or smaller.");
    }
    if (bucket === BUCKETS.RESUMES && !RESUME_TYPES.includes(req.file.mimetype)) {
      throw ApiError.badRequest("Resumes must be PDF, DOC or DOCX files.");
    }

    const stored = await StorageService.upload(req.db, {
      bucket,
      userId: req.user.id,
      documentType,
      file: req.file,
    });

    const document = await DocumentModel.create(req.db, {
      user_id: req.user.id,
      name: req.file.originalname,
      file_url: stored.publicUrl || stored.path,
      document_type: documentType,
      file_size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      status: "Pending",
    });

    if (req.user.role === "teacher" && (documentType === "RESUME" || documentType === "PHOTO")) {
      const updates =
        documentType === "RESUME"
          ? { resume_url: stored.path, resume_name: req.file.originalname }
          : { profile_photo_url: stored.publicUrl };
      const current = (await TeacherModel.findById(req.db, req.user.id)) || {};
      const percent = calculateProfileCompletion({ ...current, ...updates }).percent;
      await TeacherModel.update(req.db, req.user.id, {
        ...updates,
        profile_completion_percent: percent,
        profile_completion_percentage: percent,
      });
      if (documentType === "PHOTO") await ProfileModel.update(req.db, req.user.id, { profile_photo_url: stored.publicUrl });
    }

    res.status(201).json({
      success: true,
      data: { document, user: await AuthService.buildCurrentUser(req.auth.user) },
    });
  }),

  /** Returns a short-lived URL to open a private document. */
  getUrl: asyncHandler(async (req, res) => {
    const document = await DocumentModel.findById(req.db, req.params.id);
    if (!document) throw ApiError.notFound("Document not found.");
    const url = await StorageService.resolveUrl(req.db, bucketForDocumentType(document.document_type), document.file_url);
    if (!url) throw ApiError.notFound("This file is no longer available.");
    res.json({ success: true, data: { url } });
  }),

  /** Signed link to the signed-in teacher's own resume. */
  myResumeUrl: asyncHandler(async (req, res) => {
    const teacher = await TeacherModel.findById(req.db, req.user.id);
    if (!teacher?.resume_url) throw ApiError.notFound("No resume uploaded yet.");
    const url = await StorageService.resolveUrl(req.db, "resumes", teacher.resume_url);
    res.json({ success: true, data: { url, name: teacher.resume_name } });
  }),

  remove: asyncHandler(async (req, res) => {
    const document = await DocumentModel.findById(req.db, req.params.id);
    if (!document || document.user_id !== req.user.id) throw ApiError.notFound("Document not found.");
    await StorageService.remove(req.db, bucketForDocumentType(document.document_type), document.file_url);
    await DocumentModel.remove(req.db, document.id);
    res.json({ success: true, message: "Document removed successfully." });
  }),
};
