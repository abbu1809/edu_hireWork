import { Router } from "express";
import { VacancyController } from "../controllers/vacancy.controller.js";
import { authenticate, optionalAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/", VacancyController.listActive);
router.get("/mine", authenticate, requireRole("institute"), VacancyController.listMine);
router.get("/:id", optionalAuth, VacancyController.getById);
router.post("/", authenticate, requireRole("institute", "admin"), VacancyController.create);
router.put("/:id", authenticate, requireRole("institute", "admin"), VacancyController.update);
router.delete("/:id", authenticate, requireRole("institute", "admin"), VacancyController.remove);

export default router;
