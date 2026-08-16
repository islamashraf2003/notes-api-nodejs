import express from 'express'
import { DatabaseConnection } from './src/database/database.js'
import userRoute from './src/modules/user/routes/users.routs.js'
const app = express()
app.use(express.json())
const port = 3000

app.use('/users', userRoute)

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON format",
        });
    }

    console.error(error);
    return res.status(error.status || 500).json({
        success: false,
        message: "internal server error",
    });
});
DatabaseConnection().then(() => {
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})