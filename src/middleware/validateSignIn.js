import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString("hex"), 10);

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const validateSignIn = async (req, res, next) => {
    try {
        const { email, password } = req.body ?? {};
        const errors = {};

        if (typeof email !== "string" || email.trim() === "") {
            errors.email = "Email is required";
        } else if (!EMAIL_REGEX.test(email.trim())) {
            errors.email = "Please enter a valid email address";
        }

        if (typeof password !== "string" || password === "") {
            errors.password = "Password is required";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors,
            });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() })
            .select("+password");

        const isPasswordMatched = await bcrypt.compare(
            password,
            user?.password ?? DUMMY_HASH
        );

        if (!user || !isPasswordMatched) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        req.token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return next();
    } catch (error) {
        return next(error);
    }
};
