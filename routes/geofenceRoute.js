const express = require('express')
const geofenceRouter = express.Router()
const { authenticate, requireParent, deviceAuth } = require('../middleware/auth')
const geofenceController = require('../controllers/geofenceController')

geofenceRouter.post('/create/geofence', authenticate, requireParent, geofenceController.createGeofence)
geofenceRouter.get('/geofences', authenticate, requireParent, geofenceController.getGeofences)
geofenceRouter.put('/geofences/:geofenceId', authenticate, geofenceController.updateGeofence)
geofenceRouter.delete('/geofences/:geofenceId', authenticate, geofenceController.deleteGeofence)
geofenceRouter.patch('/geofences/:geofenceId/toggle', authenticate, geofenceController.toggleGeofence)
geofenceRouter.get("/geofences/:geofenceId/events", authenticate, geofenceController.getGeofenceEvents)


module.exports = geofenceRouter