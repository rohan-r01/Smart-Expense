import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryRule extends Document {
    keyword: string,
    category: "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER",
    confidence: number,
    priority: number,
    active: boolean,
    createdAt: Date
}

const CategoryRuleSchema = new Schema<ICategoryRule> (
    {
        keyword: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        category: {
            type: String,
            enum: ["FOOD", "TRANSPORT", "ENTERTAINMENT", "UTILITIES", "OTHER"],
            required: true
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        },
        priority: {
            type: Number,
            default: 0
        },
        active: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

export const CategoryRule = mongoose.model<ICategoryRule>("CategoryRule", CategoryRuleSchema)