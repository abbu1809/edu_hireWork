import { serviceDb } from "../config/supabase.js";
import { SettingModel } from "../models/cms.model.js";
import { cache } from "../utils/cache.js";
import { resolveTokenIdentity } from "./auth.js";

const CACHE_TTL_MS = 30 * 1000;
const SETTINGS_CACHE_KEY = "public:settings:map";

/** Clears the cached maintenance state so admin toggles take effect immediately. */
export const clearMaintenanceCache = () => {
  cache.del(SETTINGS_CACHE_KEY);
};

const getMaintenanceState = async () => {
  try {
    const map = await cache.remember(SETTINGS_CACHE_KEY, CACHE_TTL_MS, () => SettingModel.getMap(serviceDb));
    const rawMode = map?.maintenance_mode;
    const mode = rawMode === true || rawMode === "true";
    const message =
      typeof map?.maintenance_message === "string" && map.maintenance_message.trim()
        ? map.maintenance_message.trim()
        : "FacultyKart is currently undergoing scheduled maintenance. Please check back shortly.";
    return { mode, message };
  } catch {
    // Fail open if settings table is unreachable so the site doesn't lock out unexpectedly.
    return { mode: false, message: "" };
  }
};

// Routes that remain reachable during maintenance (health checks, settings lookup, login, admin panel).
const BYPASS_PREFIXES = ["/health", "/settings", "/auth", "/admin"];

const isAdminRequest = async (req) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return false;
  try {
    const { profile } = await resolveTokenIdentity(token);
    return profile?.role?.toLowerCase() === "admin";
  } catch {
    return false;
  }
};

/**
 * Blocks non-admin API traffic with 503 while maintenance_mode is enabled.
 * Administrators retain full access to all endpoints.
 */
export const maintenanceGuard = async (req, res, next) => {
  if (BYPASS_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    return next();
  }

  const state = await getMaintenanceState();
  if (!state.mode) return next();

  if (await isAdminRequest(req)) return next();

  return res.status(503).json({
    success: false,
    maintenance: true,
    message: state.message,
  });
};
