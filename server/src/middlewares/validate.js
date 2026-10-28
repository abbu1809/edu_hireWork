import { ApiError } from "../utils/ApiError.js";

/**
 * Rejects the request when any listed body field is missing or blank.
 * Usage: router.post("/", requireFields("title", "subject"), controller)
 */
export const requireFields = (...fields) => (req, res, next) => {
  const missing = fields.filter((field) => {
    const value = req.body?.[field];
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  });
  if (missing.length > 0) {
    return next(ApiError.badRequest(`Missing required field(s): ${missing.join(", ")}.`, { missing }));
  }
  next();
};
