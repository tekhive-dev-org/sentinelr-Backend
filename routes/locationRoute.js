const express = require('express')
const locationRouter = express.Router()
const { authenticate } = require('../middleware/auth')
const locationController = require('../controllers/locationController')

locationRouter.post('/update', authenticate, locationController.updateDeviceLocation)



module.exports = locationRouter

