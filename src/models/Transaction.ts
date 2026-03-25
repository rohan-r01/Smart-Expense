import mongoose, { Schema, Document } from "mongoose";

// Type safety
export interface TransactionDocument extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number;
    category: "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER";
    categoryConfidence: number,
    categorizationReason: string,
    merchant: string;
    description: string;
    transactionDate: Date;
    timeBucket: "MORNING" | "AFTERNOON" | "NIGHT";
    isRecurring: boolean;
    createdAt: Date;
}

// Data Rules (for MongoDB)
const TransactionSchema = new Schema<TransactionDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true
        },
        category: {
            type: String,
            enum: ["FOOD", "TRANSPORT", "ENTERTAINMENT", "UTILITIES", "OTHER"],
            required: true
        },
        categoryConfidence: {
            type: Number,
            required: true,
        },
        categorizationReason: {
            type: String,
            required: true,
        },
        merchant: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        transactionDate: {
            type: Date,
            required: true
        },
        timeBucket: {
            type: String,
            enum: ["MORNING", "AFTERNOON", "NIGHT"],
            required: true,
            default: function () {
                const date = this.transactionDate || new Date();
                const hour = date.getHours();

                if (hour >= 5 && hour < 12) return "MORNING";
                if (hour >= 12 && hour < 18) return "AFTERNOON";
                return "NIGHT";
            }
        },
        isRecurring: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Transaction model (for DB operations)
export const Transaction = mongoose.model<TransactionDocument>("Transaction", TransactionSchema)