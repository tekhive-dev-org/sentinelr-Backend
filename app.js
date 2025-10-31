const express = require('express')
const cors = require('cors')
const authRoute = require('./routes/authRoute')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use('/api/auth', authRoute)
app.get('/', (req, res) => { res.send('API is running !') })

module.exports = app
