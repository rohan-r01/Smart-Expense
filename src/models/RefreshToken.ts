import mongoose, { Schema, Document } from "mongoose";

export interface RefreshTokenDocument extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        token: {
            type: String,
            required: true,
            unique: true
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    { timestamps: true}
);

export const RefreshToken = mongoose.model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema);