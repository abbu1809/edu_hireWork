import { Router } from "express";
import publicRoutes from "./public.routes.js";
import authRoutes from "./auth.routes.js";
import vacancyRoutes from "./vacancy.routes.js";
import teacherRoutes from "./teacher.routes.js";
import instituteRoutes from "./institute.routes.js";
import applicationRoutes from "./application.routes.js";
import interviewRoutes from "./interview.routes.js";
import documentRoutes from "./document.routes.js";
import notificationRoutes from "./notification.routes.js";
import paymentRoutes from "./payment.routes.js";
import blogRoutes from "./blog.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/", publicRoutes);
router.use("/auth", authRoutes);
router.use("/vacancies", vacancyRoutes);
router.use("/teachers", teacherRoutes);
router.use("/institutes", instituteRoutes);
router.use("/applications", applicationRoutes);
router.use("/interviews", interviewRoutes);
router.use("/documents", documentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/blog", blogRoutes);
router.use("/admin", adminRoutes);

export default router;
