import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { AuthRequest } from "../middleware/authMiddleware";

export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const token = await AuthService.register(req.body);
            res.status(201).json({ token });
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const token = await AuthService.login(req.body);
            res.json({ token });
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message });
        }
    }

    static async refresh(req: Request, res: Response) {
        try {
            const result = await AuthService.refresh(req.body.refreshToken);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message });
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            await AuthService.logout(req.body.refreshToken);
            res.status(200).json({ message: "Logged out successfully" });
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message });
        }
    }

    static async updateCurrency(req: AuthRequest, res: Response) {
        try {
            const result = await AuthService.updateCurrency(req.user!.userId, req.body.currency);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message });
        }
    }
}
