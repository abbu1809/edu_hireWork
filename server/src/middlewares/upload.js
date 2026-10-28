import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Single-file upload kept in memory, then streamed to Supabase Storage. */
export const uploadSingle = (field = "file") =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(ApiError.badRequest("Invalid file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX."));
      }
      cb(null, true);
    },
  }).single(field);
