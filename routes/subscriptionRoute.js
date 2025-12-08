const express = require('express')
const router = express.Router()
const subscriptionController = require('../controllers/subscriptionController')
const authMiddleware = require('../middleware/auth')


router.post('/subscribe', authMiddleware, subscriptionController.createOrRenewSubscription)
router.get('/my-subscription', authMiddleware, subscriptionController.getUserSubscription)
router.patch('/change', authMiddleware, subscriptionController.changeSubscriptionType)
router.patch('/cancel', authMiddleware, subscriptionController.cancelSubscription);

// Admin routes (protect further with a role check)
router.get('/summary', authMiddleware, subscriptionController.getSubscriptionSummary)

module.exports = router
