import 'dotenv/config'
import express from 'express'
import { DatabaseConnection } from './src/database/database.js'
import userRoute from './src/modules/user/routes/users.routs.js'
import noteRoute from './src/modules/nots/routes/note.routs.js'
import AppError from './src/utilities/appError.js'
const app = express()
app.use(express.json())
const port = 3000

app.use('/users', userRoute)
app.use('/note', noteRoute)

app.use((req, res, next) => {
    next(new AppError("invaid URL", 422))
})

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Request body contains invalid JSON",
        });
    }

    console.error(error);
    return res.status(error.status || 500).json({
        message: "Error",
        error: error.message,
    });
});

DatabaseConnection().then(() => {
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})

