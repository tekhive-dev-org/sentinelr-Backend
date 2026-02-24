require('dotenv').config()
const express = require('express')
const authController = require('../controllers/authController')
const userController = require('../controllers/userController')
const upload = require('../middleware/upload')
const { authenticate, authorizeAdmin, optionalAuth } = require('../middleware/auth')
const authRouter = express.Router()
const passport = require('passport')
const jwt = require('jsonwebtoken')



authRouter.post('/auth/login', authController.login)
authRouter.post('/auth/register', authController.register)
authRouter.post('/auth/reset-password', authController.resetPassword)
authRouter.post('/auth/verify/otp', optionalAuth, authController.verifyOTP)
authRouter.post('/auth/send/otp', optionalAuth, authController.sendOtpEmail)
authRouter.get('/auth/logged-in-user', authenticate, authController.getLoggedInUserById)

authRouter.get('/admin/verified', authenticate, authorizeAdmin, authController.getAllVerifiedUsers)
authRouter.patch('/admin/:userId/block', authenticate, authorizeAdmin, authController.blockUser)
authRouter.get('/admin/blocked', authenticate, authorizeAdmin, authController.getAllBlockedUsers)
authRouter.get('/admin/all', authenticate, authorizeAdmin, authController.getAllUsers)
authRouter.put('/admin/:userId/restore', authenticate, authorizeAdmin, authController.restoreDeletedAccount)

authRouter.put('/user/update-profile-picture', authenticate, upload.single('profilePicture'), userController.updateProfilePicture)
authRouter.put('/user/update-profile', authenticate, userController.updateUserProfile)
authRouter.delete('/user/soft-delete', authenticate, userController.softDeleteAccount)

authRouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }) )
authRouter.get('/auth/google/callback', passport.authenticate('google', { session: false, failureMessage: true }), (req, res) => { 
      try{
        const token = jwt.sign({ userId: req.user.id, userRole: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1d' })
        res.status(200).json({ message: 'Login via Google successful.', token })
      }
      catch(err){  res.status(500).json({ message: 'Login via Google failed.', error: err.message }) }
    })




authRouter.get('/admin-dashboard', authenticate, authorizeAdmin, (req, res) => {
    res.json({ message: "Welcome Admin!" });
})

// INTERNAL USE ONLY
authRouter.get('/user-by-email', authenticate, authController.getUserByEmail) // /user-by-email?email=test@example.com






module.exports = authRouter