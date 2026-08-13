import express from 'express'
import { DatabaseConnection } from './src/database/database.js'
import userRoute from './src/modules/user/routes/users.routs.js'
const app = express()
app.use(express.json())
const port = 3000

app.use('/users', userRoute)

DatabaseConnection().then(() => {
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})