import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    isConfirmed: {
        type: Boolean,
        required: true,
        default: false,
    }

}, { timestamps: true, versionKey: false })

export default mongoose.model('User', userSchema)
