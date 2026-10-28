import { Router } from "express";
import { InterviewController } from "../controllers/interview.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/mine", requireRole("teacher", "institute"), InterviewController.listMine);
router.post("/", requireRole("institute"), InterviewController.schedule);

export default router;
