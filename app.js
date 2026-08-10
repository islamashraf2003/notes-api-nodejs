import express from 'express'
import mongoose from 'mongoose'
import User from './models/User.js'

const app = express()
app.use(express.json())
const port = 3000

async function main() {
    try {
        await mongoose.connect('mongodb://localhost/testdb');
        console.log('MongoDB connected successfully')
    } catch (error) {
        console.error('MongoDB connection failed:', error.message)
        process.exit(1)
    }
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/users', async (req, res) => {
    const users = await User.find()
    res.status(200).json(users)
})

app.post('/users', async (req, res) => {
    try {
        const user = await User.create(req.body)
        res.status(201).json(user)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
})

main().then(() => {
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})