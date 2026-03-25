import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export enum Role {
    USER = "USER",
    ADMIN = "ADMIN"
}

export const requiredRole = (...allowedRoles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });

        if (!allowedRoles.includes(req.user.role as Role))
            return res.status(403).json({ message: "Forbidden: insufficient permissions" });

        next();
    }
}