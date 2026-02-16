const express = require('express')
const locationRouter = express.Router()
const { authenticate, deviceAuth } = require('../middleware/auth')
const locationController = require('../controllers/locationController')

locationRouter.post('/location/update', deviceAuth, locationController.uploadLocation)



module.exports = locationRouter

