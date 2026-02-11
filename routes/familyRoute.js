const express = require('express')
const familyRouter = express.Router()
const { authenticate, requireParent } = require('../middleware/auth')
const familyController = require('../controllers/familyController')



familyRouter.post('/family/create-family', authenticate, requireParent, familyController.createFamily)
familyRouter.post('/family/create-child', authenticate, requireParent, familyController.createChildUser)
familyRouter.post('/family/add-member', authenticate, requireParent, familyController.addMemberToFamily)
familyRouter.get('/family/:familyId/members', authenticate, familyController.viewFamilyMembers)

module.exports = familyRouter