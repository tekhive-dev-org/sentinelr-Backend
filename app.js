const express = require('express')
const errorHandler = require('./middleware/errorHandler')
const http = require('http')
const rateLimit = require('express-rate-limit')
const passport = require('passport')
require('./middleware/googleOauth')
const { Server } = require('socket.io')
const cors = require('cors')
const authRoute = require('./routes/authRoute')
const familyRoute = require('./routes/familyRoute')
const deviceRoute = require('./routes/deviceRoute')
const locationRoute = require('./routes/locationRoute')
const socketHandler = require('./sockets')
const cron = require("node-cron")
const { autoExpireSubscriptions, otpCleanUp } = require("./cron-jobs/backgroundJobs")
// const path = require('path')


// Every Monday at 1am
cron.schedule("0 0 1 * * 1", async () => { 
    console.log("⏳ Running auto-expire job...")
    await autoExpireSubscriptions();
})

// Every Hour
cron.schedule("0 * * * *", async () => {
  console.log("🧹 Running OTP cleanup job...");
  await otpCleanUp();
});

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})

socketHandler(io)
global.io = io

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
  })
)
app.use(passport.initialize())

app.use('/uploads', express.static('uploads'));
app.use('/api', [authRoute, deviceRoute, familyRoute, locationRoute])

app.get('/', (req, res) => { res.send('API is running !') })
// console.log('Migrations path:', path.resolve(process.cwd(), 'migrations'));

app.use(errorHandler)

module.exports = server
