import { Request, Response } from "express";
import { User } from "../models/User";
import mongoose from "mongoose";
import { CategoryRule } from "../models/CategoryRule";

export class AdminController {
    static async getAllUsers(req: Request, res: Response) {
        try {
            const { search, role, sort } = req.query;

            const filter: any = {};

            if (search) {
                filter.email = { $regex: String(search), $options: "i" };
            }

            if (role) {
                filter.role = role;
            }

            const sortDirection = sort === "oldest" ? 1 : -1;

            const users = await User.find(filter)
                .select("_id email role createdAt")
                .sort({ createdAt: sortDirection })
                .lean();

            return res.status(200).json({ users });
        } catch (err) {
            console.error("Failed to fetch users", err);
            return res.status(500).json({ message: "Server error" });
        }
    }

    static async updateUserRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid user id" });
            }

            if (!role || !["USER", "ADMIN"].includes(role)) {
                return res.status(400).json({ message: "Valid role is required" });
            }

            const user = await User.findByIdAndUpdate(
                id,
                { role },
                { new: true, runValidators: true }
            ).select("_id email role createdAt").lean();

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            return res.status(200).json({ message: "User role updated", user });
        } catch (err) {
            console.error("Failed to update user role", err);
            return res.status(500).json({ message: "Server error" });
        }
    }

    static async getCategoryRules(req: Request, res: Response) {
        try {
            const rules = await CategoryRule.find()
                .sort({ priority: -1, confidence: -1, createdAt: -1 })
                .lean();

            return res.status(200).json({ rules });
        } catch (err) {
            console.error("Failed to fetch category rules", err);
            return res.status(500).json({ message: "Server error" });
        }
    }

    static async createCategoryRule(req: Request, res: Response) {
        try {
            const { keyword, category, confidence, priority, active } = req.body;

            if (!keyword || !category || confidence === undefined) {
                return res.status(400).json({ message: "Keyword, category, and confidence are required" });
            }

            const rule = await CategoryRule.create({
                keyword: String(keyword).trim().toLowerCase(),
                category,
                confidence: Number(confidence),
                priority: Number(priority ?? 0),
                active: active === undefined ? true : Boolean(active)
            });

            return res.status(201).json({ message: "Category rule created", rule });
        } catch (err: any) {
            console.error("Failed to create category rule", err);
            return res.status(500).json({ message: err.message || "Server error" });
        }
    }

    static async updateCategoryRule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { keyword, category, confidence, priority, active } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid rule id" });
            }

            const updatePayload: Record<string, unknown> = {};

            if (keyword !== undefined) updatePayload.keyword = String(keyword).trim().toLowerCase();
            if (category !== undefined) updatePayload.category = category;
            if (confidence !== undefined) updatePayload.confidence = Number(confidence);
            if (priority !== undefined) updatePayload.priority = Number(priority);
            if (active !== undefined) updatePayload.active = Boolean(active);

            const rule = await CategoryRule.findByIdAndUpdate(id, updatePayload, {
                new: true,
                runValidators: true
            }).lean();

            if (!rule) {
                return res.status(404).json({ message: "Category rule not found" });
            }

            return res.status(200).json({ message: "Category rule updated", rule });
        } catch (err: any) {
            console.error("Failed to update category rule", err);
            return res.status(500).json({ message: err.message || "Server error" });
        }
    }

    static async deleteCategoryRule(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid rule id" });
            }

            const rule = await CategoryRule.findByIdAndDelete(id).lean();

            if (!rule) {
                return res.status(404).json({ message: "Category rule not found" });
            }

            return res.status(200).json({ message: "Category rule deleted" });
        } catch (err) {
            console.error("Failed to delete category rule", err);
            return res.status(500).json({ message: "Server error" });
        }
    }
}
