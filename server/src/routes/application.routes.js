import { Router } from "express";
import { ApplicationController } from "../controllers/application.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/mine", requireRole("teacher"), ApplicationController.listMine);
router.post("/", requireRole("teacher"), ApplicationController.apply);
router.patch("/:id/withdraw", requireRole("teacher"), ApplicationController.withdraw);

router.get("/received", requireRole("institute"), ApplicationController.listReceived);
router.patch("/:id/status", requireRole("institute", "admin"), ApplicationController.updateStatus);

export default router;
