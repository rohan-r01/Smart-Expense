import { Transaction } from "../../models/Transaction";
import { BiasInsight } from "../../models/BiasInsight";
import { detectTimeBias } from "./biasDetectors/timeBias.detector";
import { detectCategoryBias } from "./biasDetectors/categoryBias.detector";
import { detectMerchantBias } from "./biasDetectors/merchantBias.detector";
import mongoose from "mongoose";

export class BiasInsightService {
  static async generateForUser(userId: string) {
    const transactions = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) });

    if (transactions.length < 15) return [];

    const insights = [];

    const timeBias = detectTimeBias(transactions);
    const categoryBias = detectCategoryBias(transactions);
    const merchantBias = detectMerchantBias(transactions);

    if (timeBias) {
      insights.push({
        userId: new mongoose.Types.ObjectId(userId),
        biasType: "TIME",
        value: timeBias.bucket,
        percentage: timeBias.percentage,
        severity: timeBias.percentage > 80 ? "HIGH" : timeBias.percentage > 65 ? "MEDIUM" : "LOW",
        period: "LAST_30_DAYS"
      });
    }

    if (categoryBias) {
        insights.push({
            userId: new mongoose.Types.ObjectId(userId),
            biasType: "CATEGORY",
            value: categoryBias.category,
            percentage: categoryBias.percentage,
            severity: categoryBias.percentage > 80 ? "HIGH" : categoryBias.percentage > 65 ? "MEDIUM" : "LOW",
            period: "LAST_30_DAYS"
        });
    }

    if (merchantBias) {
        insights.push({
            userId: new mongoose.Types.ObjectId(userId),
            biasType: "MERCHANT",
            value: merchantBias.merchant,
            percentage: merchantBias.percentage,
            severity: merchantBias.percentage > 80 ? "HIGH" : merchantBias.percentage > 65 ? "MEDIUM" : "LOW",
            period: "LAST_30_DAYS"
        })
    }

    if (insights.length) {
      await BiasInsight.deleteMany({ userId });
      await BiasInsight.insertMany(insights);
    }

    return insights;
  }
}