import { Router } from "express";
import { InstituteController } from "../controllers/institute.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate, requireRole("institute"));

router.put("/me", InstituteController.updateMe);
router.get("/me/talent", InstituteController.talent);
router.get("/me/unlocked", InstituteController.unlocked);

export default router;
