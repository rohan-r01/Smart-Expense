import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requiredRole, Role } from "../middleware/rbacMiddleware";

const router = Router();

router.get("/users", authMiddleware, requiredRole(Role.ADMIN), AdminController.getAllUsers);
router.patch("/users/:id/role", authMiddleware, requiredRole(Role.ADMIN), AdminController.updateUserRole);
router.get("/category-rules", authMiddleware, requiredRole(Role.ADMIN), AdminController.getCategoryRules);
router.post("/category-rules", authMiddleware, requiredRole(Role.ADMIN), AdminController.createCategoryRule);
router.patch("/category-rules/:id", authMiddleware, requiredRole(Role.ADMIN), AdminController.updateCategoryRule);
router.delete("/category-rules/:id", authMiddleware, requiredRole(Role.ADMIN), AdminController.deleteCategoryRule);

export default router;
