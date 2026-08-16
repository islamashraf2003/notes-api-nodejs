import User from "../../../models/User.js"
import bcrypt from "bcrypt";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const signUp = async (req, res) => {
    try {
        const newUser = await User.findOne({ email: req.body.email })
        console.log(newUser);
        if (newUser) {
            return res.status(401).json({
                message: 'sorry.. user exist!!',
            })
        } else {
            req.body.password = await bcrypt.hash(req.body.password, 10);
            const newUser = await User.create(req.body);
            req.body.password = undefined;
            res.status(201).json({ message: "added successfully", data: req.body })

        }
        console.log(req.body);
    } catch (error) {
        console.log(error)

    }
}
