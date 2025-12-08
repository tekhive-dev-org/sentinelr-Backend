const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const locationController = require('../controllers/locationController')

router.post('/update', authMiddleware, locationController.updateDeviceLocation)

module.exports = router

