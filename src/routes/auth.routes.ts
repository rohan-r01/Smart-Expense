import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.getProfile);
router.patch("/currency", authMiddleware, AuthController.updateCurrency);
router.patch("/preferences", authMiddleware, AuthController.updatePreferences);

export default router
