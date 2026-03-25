import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { BiasInsight } from "../models/BiasInsight";
import { BiasInsightService } from "../services/insight/biasInsightService";

export class InsightController {
  static async generateUserInsights(req: AuthRequest, res: Response) {
    try {

      const insights = await BiasInsightService.generateForUser(req.user!.userId);

      return res.status(200).json({  message: "Insights generated", insights });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  static async getUserInsights(req: AuthRequest, res: Response) {
    try {

        const insights = await BiasInsight.find({ userId: req.user!.userId }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({ insights });
    } catch (err) {
        console.error("Failed to fetch insights", err)
        return res.status(500).json({ message: "Server Error" });
    }
  }
}