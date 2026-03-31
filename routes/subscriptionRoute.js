const express = require('express')
const subscriptionRouter = express.Router()
const subscriptionController = require('../controllers/subscriptionController')
const { authenticate } = require('../middleware/auth')


subscriptionRouter.post('/subscription/create', authenticate, subscriptionController.createOrRenewSubscription)
subscriptionRouter.get('/subscription/mine', authenticate, subscriptionController.getCurrentSubscription)
subscriptionRouter.patch('/subscription/cancel', authenticate, subscriptionController.cancelSubscription)
subscriptionRouter.patch('/subscription/renew', authenticate, subscriptionController.renewSubscription)

// Admin routes (protect further with a role check)
subscriptionRouter.get('/subscription/plans', authenticate, subscriptionController.getSubscriptionPlans)
subscriptionRouter.post('/subscription/initiate', authenticate, subscriptionController.initiatePaystackPayment)
subscriptionRouter.get('/subscription/verify/:reference', authenticate, subscriptionController.verifyTransaction)
subscriptionRouter.post('/subscription/authorize/charge', authenticate, subscriptionController.chargeAuthorization)
subscriptionRouter.post('/subscription/webhook', subscriptionController.paystackWebhook)


module.exports = subscriptionRouter
