const express = require('express')
const cors = require('cors')
const authRoute = require('./routes/authRoute')
require('dotenv').config()

const app = express()
app.use(express.json())
app.use(cors())

app.use('api/auth', authRoute)

module.exports = app
