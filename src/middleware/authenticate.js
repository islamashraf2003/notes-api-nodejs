import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header is missing",
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Authorization header must be in the format: Bearer <token>",
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.userId };
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token has expired, please sign in again",
            });
        }
        return res.status(401).json({
            message: "Invalid token",
        });
    }
};
