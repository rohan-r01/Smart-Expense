import { Transaction } from "../models/Transaction";
import { CategoryRule } from "../models/CategoryRule";
import { Budget } from "../models/Budget";
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

type BudgetCategory = "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER";

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

function normalizeMerchant(merchant: string) {
  return merchant.trim().toLowerCase();
}

function roundAmount(amount: number) {
  return Number(amount.toFixed(2));
}

function formatDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function recalculateRecurringFlags(userId: string) {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const transactions = await Transaction.find({ userId: objectUserId }).select("_id merchant amount").lean();
  const recurringIds = new Set<string>();
  const groups = new Map<string, string[]>();

  for (const transaction of transactions) {
    const key = `${normalizeMerchant(transaction.merchant)}::${roundAmount(transaction.amount)}`;
    const existing = groups.get(key) ?? [];
    existing.push(String(transaction._id));
    groups.set(key, existing);
  }

  for (const ids of groups.values()) {
    if (ids.length >= 3) {
      ids.forEach((id) => recurringIds.add(id));
    }
  }

  await Transaction.updateMany({ userId: objectUserId }, { $set: { isRecurring: false } });

  if (recurringIds.size) {
    await Transaction.updateMany(
      { _id: { $in: Array.from(recurringIds) } },
      { $set: { isRecurring: true } }
    );
  }
}

export class TransactionService {
  static async create(input: CreateTransactionInput) {
    const categorization = await categorizeTransaction(`${input.merchant} ${input.description}`);

    const transaction = await Transaction.create({
      ...input,
      timeBucket: getTimeBucket(input.transactionDate),
      category: categorization.category,
      categoryConfidence: categorization.confidence,
      categorizationReason: categorization.reason
    });

    await recalculateRecurringFlags(input.userId);
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
    await recalculateRecurringFlags(input.userId);

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

    await recalculateRecurringFlags(userId);
    await BiasInsightService.generateForUser(userId);
  }

  static async getSummary(userId: string, timezone?: string) {
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const summaryTimezone = resolveSummaryTimezone(timezone);

    const [totals, categoryBreakdown, timeBucketBreakdown, topMerchants, dailyTrend, budgets, allTransactions] =
      await Promise.all([
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
      ]),
      Budget.find({ userId: objectUserId }).lean(),
      Transaction.find({ userId: objectUserId })
        .sort({ transactionDate: -1 })
        .select("_id merchant amount transactionDate isRecurring category")
        .lean()
    ]);

    const aggregateTotals = totals[0] ?? { totalSpend: 0, transactionCount: 0 };
    const recurringMap = new Map<
      string,
      { merchant: string; amount: number; occurrences: number }
    >();
    const duplicateMap = new Map<
      string,
      { merchant: string; amount: number; transactionDate: string; occurrences: number; transactionIds: string[] }
    >();

    for (const transaction of allTransactions) {
      if (transaction.isRecurring) {
        const recurringKey = `${normalizeMerchant(transaction.merchant)}::${roundAmount(transaction.amount)}`;
        const currentRecurring = recurringMap.get(recurringKey) ?? {
          merchant: transaction.merchant,
          amount: transaction.amount,
          occurrences: 0
        };
        currentRecurring.occurrences += 1;
        recurringMap.set(recurringKey, currentRecurring);
      }

      const dateKey = formatDateKey(transaction.transactionDate, summaryTimezone);
      const duplicateKey = `${normalizeMerchant(transaction.merchant)}::${roundAmount(transaction.amount)}::${dateKey}`;
      const currentDuplicate = duplicateMap.get(duplicateKey) ?? {
        merchant: transaction.merchant,
        amount: transaction.amount,
        transactionDate: dateKey,
        occurrences: 0,
        transactionIds: []
      };
      currentDuplicate.occurrences += 1;
      currentDuplicate.transactionIds.push(String(transaction._id));
      duplicateMap.set(duplicateKey, currentDuplicate);
    }

    const recurringMerchants = Array.from(recurringMap.values())
      .sort((left, right) => right.occurrences - left.occurrences)
      .slice(0, 5);

    const duplicateCandidates = Array.from(duplicateMap.values())
      .filter((item) => item.occurrences > 1)
      .sort((left, right) => right.occurrences - left.occurrences)
      .slice(0, 5);

    const categorySpendMap = new Map(categoryBreakdown.map((item) => [item._id, item.totalAmount]));
    const budgetProgress = budgets.map((budget) => {
      const spentAmount = categorySpendMap.get(budget.category) ?? 0;
      const usageRatio = budget.limitAmount > 0 ? spentAmount / budget.limitAmount : 0;

      return {
        category: budget.category,
        limitAmount: budget.limitAmount,
        spentAmount,
        remainingAmount: Math.max(budget.limitAmount - spentAmount, 0),
        usageRatio,
        status: usageRatio >= 1 ? "EXCEEDED" : usageRatio >= 0.85 ? "WARNING" : "HEALTHY"
      };
    });

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
      recurringMerchants,
      duplicateCandidates,
      budgetProgress,
      timezone: summaryTimezone,
      dailyTrend: dailyTrend.map((item) => ({
        date: item._id,
        totalAmount: item.totalAmount
      }))
    };
  }

  static async getBudgets(userId: string) {
    return Budget.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ category: 1 }).lean();
  }

  static async upsertBudget(userId: string, category: BudgetCategory, limitAmount: number) {
    return Budget.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category
      },
      {
        userId: new mongoose.Types.ObjectId(userId),
        category,
        limitAmount
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).lean();
  }
}
