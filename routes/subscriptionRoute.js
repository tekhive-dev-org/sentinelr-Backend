const express = require('express')
const subscriptionRouter = express.Router()
const subscriptionController = require('../controllers/subscriptionController')
const { authenticate } = require('../middleware/auth')


subscriptionRouter.post('/subscribe', authenticate, subscriptionController.createOrRenewSubscription)
subscriptionRouter.get('/my-subscription', authenticate, subscriptionController.getUserSubscription)
subscriptionRouter.patch('/change', authenticate, subscriptionController.changeSubscriptionType)
subscriptionRouter.patch('/cancel', authenticate, subscriptionController.cancelSubscription);

// Admin routes (protect further with a role check)
subscriptionRouter.get('/summary', authenticate, subscriptionController.getSubscriptionSummary)

module.exports = subscriptionRouter
