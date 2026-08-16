import mongoose from "mongoose";
import User from "../../../models/User.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const signUp = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        return res.status(201).json({
            message: "Account created successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isConfirmed: user.isConfirmed,
            },
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists",
            })
        }
        return next(error);
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const signIn = async (req, res) => {
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
            'sssss',
        );

        return res.status(200).json({
            message: "Welcome",
            token: token,
        });

    } catch (error) {
        return res.status(500).json({
            message: "somthing went wrong!.",
        });
    }
};

