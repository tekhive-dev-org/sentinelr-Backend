const express = require('express')
const deviceRouter = express.Router()
const { authenticate, requireParent } = require('../middleware/auth')
const deviceController = require('../controllers/deviceController')

deviceRouter.post('/device/generate/pair/code', authenticate, requireParent, deviceController.generatePairingCode)
deviceRouter.post('/device/pair', deviceController.pairDevice)
deviceRouter.get('/device/view/devices', authenticate, deviceController.viewDevices)
deviceRouter.get('/device/code-status/:code', authenticate, deviceController.getPairingCodeStatus)
deviceRouter.get('/device', authenticate, deviceController.getAllDevices)
deviceRouter.get('/device/family-devices', authenticate, deviceController.getFamilyDevices)
deviceRouter.get('/device/:deviceId', authenticate, deviceController.getSingleDevice)
deviceRouter.patch('/device/:deviceId', authenticate, deviceController.updateDevice)
deviceRouter.delete('/device/:deviceId', authenticate, deviceController.removeDevice)



module.exports = deviceRouter