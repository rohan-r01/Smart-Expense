import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { TransactionController } from "../controllers/transactionController";

const router = Router();

router.get("/", authMiddleware, TransactionController.listTransactions);
router.get("/summary", authMiddleware, TransactionController.getSummary);
router.post("/", authMiddleware, TransactionController.createTransaction);
router.patch("/:id", authMiddleware, TransactionController.updateTransaction);
router.delete("/:id", authMiddleware, TransactionController.deleteTransaction);

export default router;
