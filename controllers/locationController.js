const { Location, Device } = require('../models')
const dbConnection = require('../config/db')

exports.updateDeviceLocation = async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { deviceId, latitude, longitude } = req.body
    const userId = req.user.id

    if (!deviceId || !latitude || !longitude) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Missing location fields.' })
    }

    const device = await Device.findOne({ where: { id: deviceId, userId } })
    if (!device) {
      await transaction.rollback()
      return res.status(403).json({ message: 'Unauthorized device.' })
    }

    const location = await Location.create(
      { deviceId, latitude, longitude, timestamp: new Date() },
      { transaction }
    )

    await transaction.commit()

    // 🔥 emit update to all clients
    if (global.io) {
      global.io.emit('deviceLocationUpdate', {
        deviceId,
        latitude,
        longitude,
        updatedAt: new Date()
      })
    }

    return res.status(200).json({
      message: 'Device location updated successfully.',
      location
    })
  } catch (error) {
    await transaction.rollback()
    console.error(error)
    next(error)
  }
}
