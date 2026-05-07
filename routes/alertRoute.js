const alertRouter = require('express').Router()
const alertController = require('../controllers/alertController')
const { authenticate, deviceAuth } = require('../middleware/auth')


alertRouter.get('/alerts', authenticate, alertController.getAllAlerts)
alertRouter.get('/sos-alerts', authenticate, alertController.getSOSAlerts)
alertRouter.patch("/alerts/:alertId/resolve", authenticate, alertController.resolveAlert)
alertRouter.patch("/alerts/:alertId/dismiss", authenticate, alertController.dismissAlert)
alertRouter.post("/alerts/sos/trigger", alertController.triggerSOS)
alertRouter.get("/alerts/intruder", authenticate, alertController.getIntruderAlerts)
alertRouter.post("/alerts/intruder/report", alertController.reportIntruderAttempt)







module.exports = alertRouter