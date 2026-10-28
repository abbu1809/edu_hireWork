import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate, optionalAuth } from "../middlewares/auth.js";
import { EmailController } from "../controllers/email.controller.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const otpSendLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, message: "Too many verification emails requested. Please try again later." });
const otpVerifyLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many attempts. Please try again later." });
// Slows password guessing per IP.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many sign-in attempts. Please wait a few minutes and try again." });
const refreshLimit = rateLimit({ windowMs: 60 * 1000, max: 60, message: "Too many session refreshes. Please slow down." });

const router = Router();

router.get("/config", EmailController.authConfig);
router.post("/otp/send", otpSendLimit, EmailController.sendOtp);
router.post("/otp/verify", otpVerifyLimit, EmailController.verifyOtp);

router.post("/register", loginLimit, AuthController.register);
router.post("/login", loginLimit, AuthController.login);
router.post("/oauth/complete", loginLimit, AuthController.completeOAuth);
router.get("/google", AuthController.googleUrl);

// Sessions: access token (Bearer, ~1h) + rotating refresh token (httpOnly cookie, stored hashed in DB)
router.post("/refresh", refreshLimit, AuthController.refresh);
router.post("/logout", optionalAuth, AuthController.logout); // works with an expired access token
router.post("/logout-all", authenticate, AuthController.logoutAll);
router.get("/me", authenticate, AuthController.me);
router.get("/sessions", authenticate, AuthController.listSessions);
router.delete("/sessions/others", authenticate, AuthController.revokeOtherSessions);
router.delete("/sessions/:id", authenticate, AuthController.revokeSession);

router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.put("/password", authenticate, AuthController.changePassword);

export default router;
