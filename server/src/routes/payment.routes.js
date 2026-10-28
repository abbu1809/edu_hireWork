import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

// The webhook route is mounted in app.js with a raw body parser so the signature can be verified.
router.get("/config", PaymentController.config);
router.post("/unlock-order", authenticate, requireRole("institute"), PaymentController.createUnlockOrder);
router.post("/verify", authenticate, requireRole("institute"), PaymentController.verify);
router.get("/mine", authenticate, PaymentController.listMine);

export default router;
