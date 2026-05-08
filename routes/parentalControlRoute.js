const express = require('express')
const parentalControlController = require('../controllers/parentalControlController')
const { authenticate, deviceAuth } = require('../middleware/auth')
const parentalControlRouter = express.Router()


parentalControlRouter.get('/parental-controls/:userId', authenticate, parentalControlController.getParentalControls)
parentalControlRouter.put('/parental-controls/:childUserId/screentime/:deviceId', authenticate, parentalControlController.updateScreenTime)
parentalControlRouter.put('/parental-controls/:childUserId/app-blocking/:deviceId', authenticate, parentalControlController.updateAppBlocking)
parentalControlRouter.patch('/parental-controls/:childUserId/app-blocking/category/:deviceId', authenticate, parentalControlController.toggleAppCategoryBlock)
parentalControlRouter.patch('/parental-controls/:childUserId/app-blocking/app/:deviceId', authenticate, parentalControlController.toggleIndividualAppBlock)
parentalControlRouter.put('/parental-controls/:childUserId/web-filtering/:deviceId', authenticate, parentalControlController.updateWebFiltering)
parentalControlRouter.post('/parental-controls/:childUserId/web-filtering/blocked-websites/:deviceId', authenticate, parentalControlController.addBlockedWebsite)
parentalControlRouter.delete('/parental-controls/:childUserId/web-filtering/blocked-websites/:deviceId', authenticate, parentalControlController.removeBlockedWebsite)
parentalControlRouter.put('/parental-controls/:childUserId/bedtime/:deviceId', authenticate, parentalControlController.updateBedtime)
parentalControlRouter.post('/parental-controls/:childUserId/freeze/:deviceId', authenticate, parentalControlController.freezeDevice)
parentalControlRouter.post('/parental-controls/:childUserId/unfreeze/:deviceId', authenticate, parentalControlController.unfreezeDevice)
parentalControlRouter.post('/parental-controls/:childUserId/bonus-time', authenticate, parentalControlController.grantBonusTime)
parentalControlRouter.get('/parental-controls/:childUserId/activity', authenticate, parentalControlController.getParentalControlActivity)
parentalControlRouter.patch('/parental-controls/:childUserId/monitoring', authenticate, parentalControlController.toggleMonitoring)
parentalControlRouter.get('/parental-controls/:deviceId/installed-apps', authenticate, parentalControlController.getInstalledApps)
parentalControlRouter.get('/parental-controls/members', authenticate, parentalControlController.getParentalControlMembers)
parentalControlRouter.get('/parental-controls/device-status', deviceAuth, parentalControlController.getDeviceStatus)





module.exports = parentalControlRouter
