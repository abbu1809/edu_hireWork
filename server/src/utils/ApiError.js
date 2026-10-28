export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Please sign in to continue.", details) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found.") {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }

  static unavailable(message) {
    return new ApiError(503, message);
  }

  static tooMany(message = "Too many requests. Please try again shortly.", details) {
    return new ApiError(429, message, details);
  }
}

/**
 * Converts a Supabase/PostgREST error into an ApiError with a readable message.
 */
export const fromDbError = (error, fallback = "Database request failed.") => {
  if (!error) return new ApiError(500, fallback);
  const message = error.message || fallback;

  if (error.code === "23505" || message.includes("DUPLICATE_ACCOUNT") || /duplicate/i.test(message)) {
    return ApiError.conflict(
      message.includes("DUPLICATE_ACCOUNT")
        ? "An account already exists with these details. Please log in instead."
        : "This record already exists."
    );
  }
  if (error.code === "PGRST116") return ApiError.notFound();
  if (error.code === "42501" || /row-level security|Unauthorized|Access denied/i.test(message)) {
    return ApiError.forbidden(message.replace(/^Unauthorized:\s*/i, ""));
  }
  if (error.code === "23514" || error.code === "22P02") return ApiError.badRequest(message);
  return new ApiError(500, message);
};

/** Throws when a Supabase response carries an error; otherwise returns data. */
export const unwrap = ({ data, error }, fallback) => {
  if (error) throw fromDbError(error, fallback);
  return data;
};
