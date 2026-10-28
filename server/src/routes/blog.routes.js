import { Router } from "express";
import { BlogController } from "../controllers/blog.controller.js";
import { optionalAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", BlogController.listPublished);
router.get("/:slug", optionalAuth, BlogController.getBySlug);
router.post("/:slug/view", BlogController.recordView);

export default router;
