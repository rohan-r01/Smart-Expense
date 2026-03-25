import mongoose, { Schema, Document } from "mongoose";

export const SUPPORTED_CURRENCIES = ["USD", "INR", "AED", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    role: "USER" | "ADMIN";
    currency: SupportedCurrency;
};

const UserSchema = new Schema<IUser> (
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER"
        },
        currency: {
            type: String,
            enum: SUPPORTED_CURRENCIES,
            default: "USD"
        }
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
