import { ApiError } from "../utils/ApiError.js";

/**
 * Minimal in-memory, per-IP rate limiter (fixed window). Good for a single
 * server instance; use a shared store (Redis) if you run several.
 */
export const rateLimit = ({ windowMs = 60_000, max = 10, message = "Too many requests. Please slow down." } = {}) => {
  const hits = new Map();

  // Drop expired windows periodically so the map can't grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return next(ApiError.tooMany(message, { retryAfter }));
    }
    next();
  };
};
