const express = require('express')
const authController = require('../controllers/authController')
const userController = require('../controllers/userController')
const upload = require('../middleware/upload')
const { authenticate, authorizeAdmin, requireParent } = require('../middleware/auth')
const authRouter = express.Router()

authRouter.post('auth/login', authController.login)
authRouter.post('auth/register', authController.register)
authRouter.post('auth/reset-password', authController.resetPassword)
authRouter.post('auth/verify/otp', authenticate, authController.verifyOTP)
authRouter.post('/auth/send/otp', authenticate, authController.sendOtpEmail)

authRouter.get('/admin/verified', authenticate, authorizeAdmin, authController.getAllVerifiedUsers)
authRouter.patch('/admin/:userId/block', authenticate, authorizeAdmin, authController.blockUser)
authRouter.get('/admin/blocked', authenticate, authorizeAdmin, authController.getAllBlockedUsers)
authRouter.get('/admin/all', authenticate, authorizeAdmin, authController.getAllUsers)
authRouter.post('admin/restore-delete', authenticate, authorizeAdmin, userController.restoreDeletedAccount)

authRouter.put('/user/update-profile-picture', authenticate, upload.single('profilePicture'), authController.updateProfilePicture)
authRouter.put('/user/update-profile', authenticate, userController.updateUserProfile)
authRouter.delete('user/soft-delete', authenticate, userController.softDeleteAccount)


authRouter.post('/family/create-family', authenticate, requireParent, authController.createFamily)
authRouter.post('/family/add-member', authenticate, requireParent, authController.addMemberToFamily)
authRouter.get('/family/:familyId/members', authenticate, authController.viewFamilyMembers)

authRouter.get('/devices', authenticate, authController.viewDevices)


authRouter.get('/admin-dashboard', authenticate, authorizeAdmin, (req, res) => {
    res.json({ message: "Welcome Admin!" });
});


module.exports = authRouter