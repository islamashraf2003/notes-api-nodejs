import mongoose from "mongoose";

export const DatabaseConnection = async () => {
    try {
        await mongoose.connect('mongodb://localhost/testdb');
        console.log('MongoDB connected successfully')
    } catch (error) {
        console.error('MongoDB connection failed:', error.message)
        process.exit(1)
    }
}