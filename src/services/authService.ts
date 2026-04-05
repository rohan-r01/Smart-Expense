import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { generateAccessToken, generateRefreshToken } from "../utils/token";
import { hashPassword, verifyPassword } from "../utils/auth";
import { SUPPORTED_CURRENCIES } from "../models/User";

export class AuthService {
    static async register({ email, password, currency, timezone }: any) {
        if (!email || !password)
            throw { status: 400, message: "Email and password required" };

        const normalizedCurrency = currency && SUPPORTED_CURRENCIES.includes(currency) ? currency : "USD";
        const normalizedTimezone = typeof timezone === "string" && timezone.trim() ? timezone.trim() : "UTC";

        const existing = await User.findOne({ email });
        if (existing)
            throw { status: 400, message: "User already exists" };

        const passwordHash = await hashPassword(password);

        const user = await User.create({ email, passwordHash, role: "USER", currency: normalizedCurrency, timezone: normalizedTimezone });

        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            role: user.role,
            currency: user.currency,
            timezone: user.timezone
        });

        const refreshToken = generateRefreshToken();

        await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)});

        return { accessToken, refreshToken };
    }

    static async login({ email, password }: any) {
        if (!email || !password)
            throw { status: 400, message: "Email and password required" };

        const user = await User.findOne({ email });
        if (!user)
            throw { status: 401, message: "User does not exist" }

        const valid  = await verifyPassword(password, user.passwordHash);
        if (!valid)
            throw { status: 401, message: "Invalid credentials" };

        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            role: user.role,
            currency: user.currency,
            timezone: user.timezone
        });

        const refreshToken = generateRefreshToken();

        await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)});

        return { accessToken, refreshToken };
    }

    static async refresh(refreshToken: string) {
        if (!refreshToken)
            throw { status: 401, message: "Refresh token required" };

        const stored = await RefreshToken.findOne({ token: refreshToken });
        if (!stored)
            throw { status: 403, message: "Invalid refresh token" };

        if (stored.expiresAt < new Date()) {
            await stored.deleteOne();
            throw { status: 403, message: "Refresh token expired" };
        }

        const user = await User.findById(stored.userId).select("_id role currency timezone").lean();
        if (!user) {
            await stored.deleteOne();
            throw { status: 403, message: "User no longer exists" };
        }

        const accessToken = generateAccessToken({
            userId: stored.userId.toString(),
            role: user.role,
            currency: user.currency,
            timezone: user.timezone
        });

        return { accessToken };
    }

    static async getProfile(userId: string) {
        const user = await User.findById(userId).select("_id email role currency timezone createdAt").lean();

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        return { user };
    }

    static async updatePreferences(userId: string, input: { currency?: string; timezone?: string }) {
        const updatePayload: { currency?: string; timezone?: string } = {};

        if (input.currency !== undefined) {
            if (!SUPPORTED_CURRENCIES.includes(input.currency as (typeof SUPPORTED_CURRENCIES)[number])) {
                throw { status: 400, message: "Unsupported currency" };
            }

            updatePayload.currency = input.currency;
        }

        if (input.timezone !== undefined) {
            if (typeof input.timezone !== "string" || !input.timezone.trim()) {
                throw { status: 400, message: "Timezone is required" };
            }

            updatePayload.timezone = input.timezone.trim();
        }

        if (!Object.keys(updatePayload).length) {
            throw { status: 400, message: "No preference fields provided" };
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updatePayload,
            { new: true, runValidators: true }
        ).select("_id role currency timezone").lean();

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            role: user.role,
            currency: user.currency,
            timezone: user.timezone
        });

        return { accessToken, currency: user.currency, timezone: user.timezone };
    }

    static async updateCurrency(userId: string, currency: string) {
        return AuthService.updatePreferences(userId, { currency });
    }

    static async logout(refreshToken: string) {
        if (!refreshToken)
            throw { status: 400, message: "Refresh token required" };

        await RefreshToken.deleteOne({ token: refreshToken });
    }


}
