import mongoose, { Document, Schema } from "mongoose";

export interface BudgetDocument extends Document {
  userId: mongoose.Types.ObjectId;
  category: "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER";
  limitAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<BudgetDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["FOOD", "TRANSPORT", "ENTERTAINMENT", "UTILITIES", "OTHER"],
      required: true
    },
    limitAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model<BudgetDocument>("Budget", BudgetSchema);
