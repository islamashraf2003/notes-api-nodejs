import bcrypt from "bcrypt";
import User from "../../../models/User.js";
import { EMAIL_ENABLED } from "../../../config/env.js";
import { sendWelcomeEmail } from "../../../utilities/sendEmail.js";

const BCRYPT_ROUNDS = 10;

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const signUp = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await User.create({ name, email, password: hashedPassword });

        if (EMAIL_ENABLED) {
            sendWelcomeEmail({ email: user.email, name: user.name }).catch(
                (error) => console.error("Failed to send welcome email:", error.message)
            );
        }

        return res.status(201).json({
            message: "Account created successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isConfirmed: user.isConfirmed,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists",
            });
        }
        return next(error);
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const signIn = (req, res) =>
    res.status(200).json({
        message: "Signed in successfully",
        token: req.token,
    });
