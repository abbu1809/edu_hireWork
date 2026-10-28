import { Router } from "express";
import { PublicController } from "../controllers/public.controller.js";
import { EmailController } from "../controllers/email.controller.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const formLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many submissions. Please try again later." });

const router = Router();

router.get("/health", PublicController.health);
router.get("/stats", PublicController.stats);
router.get("/settings", PublicController.settings);
router.get("/payment-links", PublicController.paymentLinks);
router.get("/form-fields", PublicController.formFields);
router.get("/institutes", PublicController.featuredInstitutes);
router.post("/contact", formLimit, PublicController.contact);
router.post("/subscribe", formLimit, EmailController.subscribe);
router.post("/unsubscribe", formLimit, EmailController.unsubscribe);

export default router;
