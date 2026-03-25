import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { InsightController } from "../controllers/insightController";

const router = Router();

router.get("/", authMiddleware, InsightController.getUserInsights);
router.post("/generate", authMiddleware, InsightController.generateUserInsights);

export default router;