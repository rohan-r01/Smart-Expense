import { Transaction } from "../models/Transaction";
import { CategoryRule } from "../models/CategoryRule";
import { categorizeTransaction } from "./categorizationService";
import { BiasInsightService } from "./insight/biasInsightService";
import mongoose from "mongoose";

const DEFAULT_SUMMARY_TIMEZONE = process.env.APP_TIMEZONE || process.env.TZ || "Asia/Dubai";

interface CreateTransactionInput {
  userId: string;
  amount: number;
  merchant: string;
  description: string;
  transactionDate: Date;
}

interface UpdateTransactionInput {
  userId: string;
  transactionId: string;
  amount?: number;
  merchant?: string;
  description?: string;
  transactionDate?: Date;
  category?: "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER";
  saveAsRule?: boolean;
  ruleKeyword?: string;
}

function getTimeBucket(date: Date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 18) return "AFTERNOON";
  return "NIGHT";
}

function resolveSummaryTimezone(timezone?: string) {
  if (!timezone) {
    return DEFAULT_SUMMARY_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_SUMMARY_TIMEZONE;
  }
}

export class TransactionService {
  static async create(input: CreateTransactionInput) {
    const categorization = await categorizeTransaction(`${input.merchant} ${input.description}`);

    const transaction = await Transaction.create({
      ...input,
      category: categorization.category,
      categoryConfidence: categorization.confidence,
      categorizationReason: categorization.reason
    });

    await BiasInsightService.generateForUser(input.userId);

    return transaction;
  }

  static async update(input: UpdateTransactionInput) {
    const transaction = await Transaction.findOne({
      _id: input.transactionId,
      userId: new mongoose.Types.ObjectId(input.userId)
    });

    if (!transaction) {
      throw { status: 404, message: "Transaction not found" };
    }

    if (typeof input.amount === "number") {
      transaction.amount = input.amount;
    }

    if (typeof input.merchant === "string") {
      transaction.merchant = input.merchant;
    }

    if (typeof input.description === "string") {
      transaction.description = input.description;
    }

    if (input.category) {
      transaction.category = input.category;
      transaction.categoryConfidence = 1;
      transaction.categorizationReason = "Manually set by user";
    }

    if (input.transactionDate) {
      transaction.transactionDate = input.transactionDate;
      transaction.timeBucket = getTimeBucket(input.transactionDate);
    }

    if (!input.category && (typeof input.merchant === "string" || typeof input.description === "string")) {
      const categorization = await categorizeTransaction(`${transaction.merchant} ${transaction.description}`);
      transaction.category = categorization.category as typeof transaction.category;
      transaction.categoryConfidence = categorization.confidence;
      transaction.categorizationReason = categorization.reason;
    }

    await transaction.save();

    if (input.saveAsRule && input.ruleKeyword && input.category) {
      const normalizedKeyword = input.ruleKeyword.trim().toLowerCase();

      if (normalizedKeyword) {
        await CategoryRule.findOneAndUpdate(
          { keyword: normalizedKeyword },
          {
            keyword: normalizedKeyword,
            category: input.category,
            confidence: 0.95,
            priority: 15,
            active: true
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    await BiasInsightService.generateForUser(input.userId);

    return transaction;
  }

  static async delete(userId: string, transactionId: string) {
    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!transaction) {
      throw { status: 404, message: "Transaction not found" };
    }

    await BiasInsightService.generateForUser(userId);
  }

  static async getSummary(userId: string, timezone?: string) {
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const summaryTimezone = resolveSummaryTimezone(timezone);

    const [totals, categoryBreakdown, timeBucketBreakdown, topMerchants, dailyTrend] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: "$amount" },
            transactionCount: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      Transaction.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: "$timeBucket",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      Transaction.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: "$merchant",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 5 }
      ]),
      Transaction.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$transactionDate",
                timezone: summaryTimezone
              }
            },
            totalAmount: { $sum: "$amount" }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 7 },
        { $sort: { _id: 1 } }
      ])
    ]);

    const aggregateTotals = totals[0] ?? { totalSpend: 0, transactionCount: 0 };

    return {
      totalSpend: aggregateTotals.totalSpend,
      transactionCount: aggregateTotals.transactionCount,
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id,
        totalAmount: item.totalAmount,
        count: item.count
      })),
      timeBucketBreakdown: timeBucketBreakdown.map((item) => ({
        timeBucket: item._id,
        totalAmount: item.totalAmount,
        count: item.count
      })),
      topMerchants: topMerchants.map((item) => ({
        merchant: item._id,
        totalAmount: item.totalAmount,
        count: item.count
      })),
      timezone: summaryTimezone,
      dailyTrend: dailyTrend.map((item) => ({
        date: item._id,
        totalAmount: item.totalAmount
      }))
    };
  }
}
