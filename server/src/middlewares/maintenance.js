import { anonDb, serviceDb } from "../config/supabase.js";
import { ProfileModel } from "../models/profile.model.js";
import { SettingModel } from "../models/cms.model.js";

const CACHE_TTL_MS = 15 * 1000;
let cached = { loadedAt: 0, mode: false, message: "" };

/** Clears the cached maintenance state so admin toggles take effect immediately. */
export const clearMaintenanceCache = () => {
  cached = { loadedAt: 0, mode: false, message: "" };
};

const getMaintenanceState = async () => {
  if (Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached;
  try {
    const map = await SettingModel.getMap(serviceDb);
    const rawMode = map?.maintenance_mode;
    const mode = rawMode === true || rawMode === "true";
    const message =
      typeof map?.maintenance_message === "string" && map.maintenance_message.trim()
        ? map.maintenance_message.trim()
        : "FacultyKart is currently undergoing scheduled maintenance. Please check back shortly.";
    cached = { loadedAt: Date.now(), mode, message };
  } catch {
    // Fail open if settings table is unreachable so the site doesn't lock out unexpectedly.
    cached = { loadedAt: Date.now(), mode: false, message: "" };
  }
  return cached;
};

// Routes that remain reachable during maintenance (health checks, settings lookup, login, admin panel).
const BYPASS_PREFIXES = ["/health", "/settings", "/auth", "/admin"];

const isAdminRequest = async (req) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return false;
  try {
    const { data, error } = await anonDb.auth.getUser(token);
    if (error || !data?.user) return false;
    const profile = await ProfileModel.findById(serviceDb, data.user.id);
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
