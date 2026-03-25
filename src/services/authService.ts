import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { generateAccessToken, generateRefreshToken } from "../utils/token";
import { hashPassword, verifyPassword } from "../utils/auth";
import { SUPPORTED_CURRENCIES } from "../models/User";

export class AuthService {
    static async register({ email, password, currency }: any) {
        if (!email || !password)
            throw { status: 400, message: "Email and password required" };

        const normalizedCurrency = currency && SUPPORTED_CURRENCIES.includes(currency) ? currency : "USD";

        const existing = await User.findOne({ email });
        if (existing)
            throw { status: 400, message: "User already exists" };

        const passwordHash = await hashPassword(password);

        const user = await User.create({ email, passwordHash, role: "USER", currency: normalizedCurrency });

        const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role, currency: user.currency });

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

        const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role, currency: user.currency });

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

        const user = await User.findById(stored.userId).select("_id role currency").lean();
        if (!user) {
            await stored.deleteOne();
            throw { status: 403, message: "User no longer exists" };
        }

        const accessToken = generateAccessToken({ userId: stored.userId.toString(), role: user.role, currency: user.currency });

        return { accessToken };
    }

    static async updateCurrency(userId: string, currency: string) {
        if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
            throw { status: 400, message: "Unsupported currency" };
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { currency },
            { new: true, runValidators: true }
        ).select("_id role currency").lean();

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role, currency: user.currency });

        return { accessToken, currency: user.currency };
    }

    static async logout(refreshToken: string) {
        if (!refreshToken)
            throw { status: 400, message: "Refresh token required" };

        await RefreshToken.deleteOne({ token: refreshToken });
    }


}
