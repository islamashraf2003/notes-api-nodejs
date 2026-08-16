import User from "../../../models/User.js"
import bcrypt from "bcrypt";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const signUp = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email and password are required",
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });

        return res.status(201).json({
            message: "added successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isConfirmed: user.isConfirmed,
            },
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "sorry.. user exist!!" })
        }
        return next(error);
    }
}
