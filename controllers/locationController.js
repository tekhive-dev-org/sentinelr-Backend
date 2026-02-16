require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { Location, Device, dbConnection } = require('../models')


// exports.updateDeviceLocation = async (req, res, next) => {
//   const transaction = await dbConnection.transaction()
//   try {
//     const { deviceId, latitude, longitude } = req.body
//     const userId = req.user.id

//     if (!deviceId || !latitude || !longitude) {
//       await transaction.rollback()
//       return res.status(400).json({ message: 'Missing location fields.' })
//     }

//     const device = await Device.findOne({ where: { id: deviceId, userId } })
//     if (!device) {
//       await transaction.rollback()
//       return res.status(403).json({ message: 'Unauthorized device.' })
//     }

//     const location = await Location.create(
//       { deviceId, latitude, longitude, timestamp: new Date() },
//       { transaction }
//     )

//     await transaction.commit()

//     // 🔥 emit update to all clients
//     if (global.io) {
//       global.io.emit('deviceLocationUpdate', {
//         deviceId,
//         latitude,
//         longitude,
//         updatedAt: new Date()
//       })
//     }

//     return res.status(200).json({
//       message: 'Device location updated successfully.',
//       location
//     })
//   } catch (error) {
//     await transaction.rollback()
//     console.error(error)
//     next(error)
//   }
// }

const THROTTLE = parseInt(process.env.LOCATION_THROTTLE_MS) || 5000

exports.uploadLocation = catchAsync(async (req, res) => {
  // const deviceId = parseInt(req.device.deviceId, 10)
  const deviceId = req.device.id
  const transaction = await dbConnection.transaction()

  const {
    latitude,
    longitude,
    accuracy,
    altitude,
    speed,
    timestamp,
    source
  } = req.body

  if (!latitude || !longitude) { throw new AppError('Latitude and longitude required', 400) }

  const device = await Device.findByPk(deviceId, { transaction })
  if (!device) { throw new AppError('Device not found', 404) }

  // Throttle before opening transaction
  if (device.lastSeen && Date.now() - device.lastSeen.getTime() < THROTTLE) {return res.status(200).json({ success: true }) }

  try {
    const pingTime = timestamp ? new Date(timestamp) : new Date()

    await Location.create({
      deviceId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      timestamp: pingTime,
      source
    }, { transaction })

    await device.update({ lastLatitude: latitude, lastLongitude: longitude, lastSeen: pingTime, status: 'Online' }, { transaction })
    await transaction.commit()
    res.status(200).json({ success: true, message: 'Ping received' })
  } 
  catch (error) {
    await transaction.rollback()
    throw error
  }
})


