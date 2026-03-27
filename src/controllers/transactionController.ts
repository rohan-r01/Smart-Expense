import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { Transaction } from "../models/Transaction";
import { TransactionService } from "../services/transactionService";
import mongoose from "mongoose";

export class TransactionController {
  private static buildListFilter(req: AuthRequest) {
    const { timeBucket, category, merchant, startDate, endDate } = req.query;
    const filter: any = {};

    if (req.user!.userId) filter.userId = req.user!.userId;
    if (timeBucket) filter.timeBucket = timeBucket;
    if (category) filter.category = category;
    if (merchant) filter.merchant = { $regex: String(merchant), $options: "i" };

    if (startDate || endDate) {
      filter.transactionDate = {};

      if (startDate) {
        filter.transactionDate.$gte = new Date(String(startDate));
      }

      if (endDate) {
        filter.transactionDate.$lte = new Date(String(endDate));
      }
    }

    return filter;
  }

  static async createTransaction(req: AuthRequest, res: Response) {
    try {
        const { amount, merchant, description, transactionDate } = req.body;

        if (!amount || !merchant || !description || !transactionDate) {
        return res.status(400).json({ message: "Missing Required Fields" });
        }

        const transaction = await TransactionService.create({ userId: req.user!.userId, amount, merchant, description, transactionDate });

        return res.status(201).json({ message: "Transaction Created", transaction });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
  }

  static async listTransactions(req: AuthRequest, res: Response) {
    try {
        const filter = TransactionController.buildListFilter(req);
        const transactions = await Transaction.find(filter).sort({ transactionDate: -1 });

        return res.status(200).json({ count: transactions.length, transactions });
    } catch (err) {
        return res.status(500).json({ message: "Server Error" });
    }
  }

  static async updateTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { amount, merchant, description, transactionDate, category, saveAsRule, ruleKeyword } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid transaction id" });
      }

      const transaction = await TransactionService.update({
        userId: req.user!.userId,
        transactionId: id,
        amount,
        merchant,
        description,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        category,
        saveAsRule,
        ruleKeyword
      });

      return res.status(200).json({ message: "Transaction updated", transaction });
    } catch (error: any) {
      return res.status(error.status || 500).json({ message: error.message || "Server Error" });
    }
  }

  static async deleteTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid transaction id" });
      }

      await TransactionService.delete(req.user!.userId, id);

      return res.status(200).json({ message: "Transaction deleted" });
    } catch (error: any) {
      return res.status(error.status || 500).json({ message: error.message || "Server Error" });
    }
  }

  static async getSummary(req: AuthRequest, res: Response) {
    try {
      const timezone = typeof req.query.timezone === "string" ? req.query.timezone : undefined;
      const summary = await TransactionService.getSummary(req.user!.userId, timezone);

      return res.status(200).json(summary);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  static async getBudgets(req: AuthRequest, res: Response) {
    try {
      const budgets = await TransactionService.getBudgets(req.user!.userId);
      return res.status(200).json({ budgets });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  static async upsertBudget(req: AuthRequest, res: Response) {
    try {
      const { category } = req.params;
      const { limitAmount } = req.body;

      if (!["FOOD", "TRANSPORT", "ENTERTAINMENT", "UTILITIES", "OTHER"].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      if (typeof limitAmount !== "number" || limitAmount < 0) {
        return res.status(400).json({ message: "limitAmount must be a non-negative number" });
      }

      const budget = await TransactionService.upsertBudget(
        req.user!.userId,
        category as "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER",
        limitAmount
      );

      return res.status(200).json({ message: "Budget saved", budget });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  static async exportCsv(req: AuthRequest, res: Response) {
    try {
      const filter = TransactionController.buildListFilter(req);
      const transactions = await Transaction.find(filter).sort({ transactionDate: -1 }).lean();

      const escapeCsv = (value: string | number | boolean) =>
        `"${String(value).replace(/"/g, "\"\"")}"`;

      const rows = [
        ["Merchant", "Description", "Amount", "Category", "Confidence", "Time Bucket", "Recurring", "Transaction Date"],
        ...transactions.map((transaction) => [
          transaction.merchant,
          transaction.description,
          transaction.amount,
          transaction.category,
          Math.round(transaction.categoryConfidence * 100),
          transaction.timeBucket,
          transaction.isRecurring ? "Yes" : "No",
          new Date(transaction.transactionDate).toISOString()
        ])
      ];

      const csv = rows
        .map((row) => row.map((value) => escapeCsv(value)).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');

      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  }
}
