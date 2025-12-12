const express = require('express')
const authController = require('../controllers/authController')
const userController = require('../controllers/userController')
const upload = require('../middleware/upload')
const { authenticate, authorizeAdmin } = require('../middleware/auth')
const authRouter = express.Router()

authRouter.post('/login', authController.login)
authRouter.post('/register', authController.register)
authRouter.post('/reset-password', authController.resetPassword)
authRouter.post('/verify', authenticate, authController.verifyOTP)
authRouter.put('/update-profile-picture', authenticate, upload.single('profilePicture'), authController.updateProfilePicture)
authRouter.get('/users/verified', authenticate, authorizeAdmin, authController.getAllVerifiedUsers)
authRouter.patch('/users/:userId/block', authenticate, authorizeAdmin, authController.blockUser)
authRouter.get('/users/blocked', authenticate, authorizeAdmin, authController.getAllBlockedUsers)
authRouter.get('/users/all', authenticate, authorizeAdmin, authController.getAllUsers)

authRouter.put('/user/update-profile', authenticate, userController.updateUserProfile)
authRouter.delete('user/soft-delete', authenticate, userController.softDeleteAccount)
authRouter.post('user/restore-delete', authenticate, userController.restoreDeletedAccount)

authRouter.post('/family/create-family', authenticate, authController.createFamily)
authRouter.post('/family/add-member', authenticate, authController.addMemberToFamily)
authRouter.get('/family/:familyId/members', authenticate, authController.viewFamilyMembers)
authRouter.get('/devices', authenticate, authController.viewDevices)


authRouter.get('/admin-dashboard', authenticate, authorizeAdmin, (req, res) => {
    res.json({ message: "Welcome Admin!" });
});


module.exports = authRouter