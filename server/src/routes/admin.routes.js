import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { BlogController } from "../controllers/blog.controller.js";
import { EmailController } from "../controllers/email.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate, requireRole("admin"));

router.get("/stats", AdminController.stats);

// Teachers & institutes (":entity" is "teachers" or "institutes")
router.get("/teachers", AdminController.listTeachers);
router.post("/teachers", AdminController.createTeacher);
router.get("/institutes", AdminController.listInstitutes);
router.post("/institutes", AdminController.createInstitute);
router.put("/:entity(teachers|institutes)/:id", AdminController.updateEntity);
router.post("/:entity(teachers|institutes)/:id/verify", AdminController.verifyEntity);
router.post("/:entity(teachers|institutes)/:id/feature", AdminController.featureEntity);
router.post("/:entity(teachers|institutes)/:id/archive", AdminController.archiveEntity);
router.post("/:entity(teachers|institutes)/:id/flag", AdminController.flagEntity);
router.delete("/:entity(teachers|institutes)/:id", AdminController.deleteEntity);
router.get("/audit-logs", AdminController.auditLogs);

// Vacancies, applications, matchmaking, broadcast
router.get("/vacancies", AdminController.listVacancies);
router.get("/applications", AdminController.listApplications);
router.post("/matchmake", AdminController.matchmake);
router.post("/broadcast", AdminController.broadcast);

// Finance
router.get("/payments", AdminController.payments);

// Content CMS
router.get("/blog", BlogController.listAll);
router.post("/blog", BlogController.create);
router.put("/blog/:id", BlogController.update);
router.delete("/blog/:id", BlogController.remove);

router.get("/form-fields", AdminController.listFormFields);
router.post("/form-fields", AdminController.createFormField);
router.put("/form-fields/:id", AdminController.updateFormField);
router.delete("/form-fields/:id", AdminController.deleteFormField);

router.get("/payment-links", AdminController.listPaymentLinks);
router.post("/payment-links", AdminController.createPaymentLink);
router.put("/payment-links/:id", AdminController.updatePaymentLink);
router.delete("/payment-links/:id", AdminController.deletePaymentLink);

router.put("/settings/:key", AdminController.updateSetting);

// Email: delivery status, test send, campaigns, logs, subscribers
router.get("/email/status", EmailController.status);
router.post("/email/test", EmailController.sendTest);
router.post("/email/broadcast", EmailController.broadcast);
router.get("/email/broadcasts", EmailController.listBroadcasts);
router.get("/email/logs", EmailController.logs);
router.get("/subscribers", EmailController.subscribers);

router.get("/inquiries", AdminController.inquiries);
router.patch("/inquiries/:id", AdminController.updateInquiry);

export default router;
