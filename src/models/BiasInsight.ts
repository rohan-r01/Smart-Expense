import mongoose, { Schema, Document } from "mongoose";

export interface IBiasInsight extends Document {
    userId: mongoose.Types.ObjectId;
    biasType: "CATEGORY" | "TIME" | "MERCHANT";
    value: string;
    percentage: number;
    severity: "LOW" | "MEDIUM" | "HIGH";
    period: string;
    generatedFrom: "RULE_ENGINE";
    createdAt: Date;
    updatedAt: Date;
}

const BiasInsightSchema = new Schema<IBiasInsight>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },
        biasType: {
            type: String,
            enum: ["CATEGORY", "TIME", "MERCHANT"],
            required: true
        },
        value: {
            type: String,
            required: true
        },
        percentage: {
            type: Number,
            required: true
        },
        severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            required: true
        },
        period: {
            type: String,
            required: true
        },
        generatedFrom: {
            type: String,
            enum: ["RULE_ENGINE"],
            default: "RULE_ENGINE"
        }
    },
    { timestamps: true }
);

export const BiasInsight = mongoose.model<IBiasInsight>("BiasInsight", BiasInsightSchema)