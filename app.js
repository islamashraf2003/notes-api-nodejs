import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { PORT, IS_PRODUCTION } from './src/config/env.js'
import { DatabaseConnection } from './src/database/database.js'
import userRoute from './src/modules/user/routes/users.routes.js'
import noteRoute from './src/modules/notes/routes/note.routes.js'
import AppError from './src/utilities/appError.js'

const app = express()

app.set('trust proxy', 1)

app.use(express.json({ limit: '100kb' }))

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

app.use('/users', userRoute)
app.use('/notes', noteRoute)

app.use((req, res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
})

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            message: 'Request body contains invalid JSON',
        })
    }

    const status = error.status ?? 500

    if (status >= 500) {
        console.error(error)
    }

    return res.status(status).json({
        message:
            status >= 500 && IS_PRODUCTION
                ? 'Internal server error'
                : error.message,
    })
})

/**
 * @param {import('http').Server} server
 */
const shutdown = (server) => async () => {
    console.log('Shutting down...')
    server.close(async () => {
        await mongoose.connection.close()
        process.exit(0)
    })
}

const start = async () => {
    await DatabaseConnection()
    const server = app.listen(PORT, () =>
        console.log(`API listening on http://localhost:${PORT}`)
    )
    process.on('SIGINT', shutdown(server))
    process.on('SIGTERM', shutdown(server))
}

start().catch((error) => {
    console.error('Failed to start:', error.message)
    process.exit(1)
})

export default app
