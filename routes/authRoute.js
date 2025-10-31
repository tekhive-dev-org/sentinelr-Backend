const express = require('express')
const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/auth')
const authRouter = express.Router()

authRouter.post('/login', authController.login)
authRouter.post('/register', authController.register)
authRouter.post('/verify', authMiddleware, authController.verifyOTP)


module.exports = authRouter