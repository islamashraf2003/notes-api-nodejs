import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Verifies the sign-in credentials and attaches a signed token to the request
 * so the controller only has to shape the response.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const validateSignIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(404).json({
                message: "Email not found",
            });
        }

        const isPasswordMatched = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatched) {
            return res.status(401).json({
                message: "Incorrect password",
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            "sssss"
        );

        req.token = token;

        return next();

    } catch (error) {
        return next(error);
    }
};