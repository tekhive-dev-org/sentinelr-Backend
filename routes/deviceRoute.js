const express = require('express')
const deviceRouter = express.Router()
const { authenticate, requireParent } = require('../middleware/auth')
const deviceController = require('../controllers/deviceController')

deviceRouter.post('/device/generate/pair/code', authenticate, requireParent, deviceController.generatePairingCode)
deviceRouter.post('/device/pair', deviceController.pairDevice)
deviceRouter.get('/device/view/devices', authenticate, deviceController.viewDevices)

module.exports = deviceRouter