import multer from "multer";
import { config } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Something went wrong.";

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File size exceeds the 10MB limit." : err.message;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Request body is not valid JSON.";
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 && config.nodeEnv === "production" ? "Internal server error." : message,
    ...(err.details ? { details: err.details } : {}),
  });
};
