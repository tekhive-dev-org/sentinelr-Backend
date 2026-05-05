const alertRouter = require('express').Router()
const alertController = require('../controllers/alertController')
const { authenticate } = require('../middleware/auth')


alertRouter.get('/alerts', authenticate, alertController.getAllAlerts)
alertRouter.get('/sos-alerts', authenticate, alertController.getSOSAlerts)
alertRouter.patch("/alerts/:alertId/resolve", authenticate, alertController.resolveAlert)
alertRouter.patch("/alerts/:alertId/dismiss", authenticate, alertController.dismissAlert)
alertRouter.post("/alerts/sos/trigger", authenticate, alertController.triggerSOS)





module.exports = alertRouter