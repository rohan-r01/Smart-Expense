import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET!;

export function generateAccessToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "10m" });
}

export function generateRefreshToken() {
    return crypto.randomBytes(40).toString("hex");
}