import { Router } from "express";
import { TeacherController } from "../controllers/teacher.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

// Signed-in teacher
router.put("/me", authenticate, requireRole("teacher"), TeacherController.updateMe);
router.get("/me/preferences", authenticate, requireRole("teacher"), TeacherController.getPreferences);
router.put("/me/preferences", authenticate, requireRole("teacher"), TeacherController.updatePreferences);

// Public faculty directory
router.get("/", TeacherController.listPublic);
router.get("/:id", TeacherController.getPublic);

export default router;
