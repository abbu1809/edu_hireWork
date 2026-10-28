import { Router } from "express";
import { DocumentController } from "../controllers/document.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { uploadSingle } from "../middlewares/upload.js";

const router = Router();

router.use(authenticate, requireRole("teacher", "institute"));

router.get("/", DocumentController.listMine);
router.post("/", uploadSingle("file"), DocumentController.upload);
router.get("/resume/url", requireRole("teacher"), DocumentController.myResumeUrl);
router.get("/:id/url", DocumentController.getUrl);
router.delete("/:id", DocumentController.remove);

export default router;
