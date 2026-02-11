const express = require('express')
const deviceRouter = express.Router()
const { authenticate, requireParent } = require('../middleware/auth')
const deviceController = require('../controllers/deviceController')

deviceRouter.post('/device/generate/pair/code', authenticate, requireParent, deviceController.generatePairingCode)
deviceRouter.post('/device/pair', deviceController.pairDevice)
deviceRouter.get('/device/view/devices', authenticate, deviceController.viewDevices)
deviceRouter.get('/device/code-status/:code', authenticate, deviceController.checkPairingCodeStatus)
deviceRouter.get('/device/all', authenticate, deviceController.listDevices)
deviceRouter.get('/device/:id', authenticate, deviceController.getDevice)


module.exports = deviceRouter