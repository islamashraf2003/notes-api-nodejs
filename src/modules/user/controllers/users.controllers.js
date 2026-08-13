import User from '../../../../models/User.js'
import { DatabaseConnection } from '../../../database/database.js'


export const allUsers = async (req, res) => {
    try {
        const users = await User.find()
        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        })
    } catch (error) {
        console.error('Failed to fetch users:', error.message)

        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
        })
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

export const addUser = async (req, res) => {
    try {
        console.log("req of add users --------->", req.body);

        const newUser = await User.create(
            {
                name: req.body.name,
                age: req.body.age,
                email: req.body.email,
            }
        );

        res.status(201).json(newUser);

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}


