import User from '../../../../models/User.js'
import { DatabaseConnection } from '../../../database/database'


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
