require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { Op } = require('sequelize');
const { Location, FamilyMember, Family, Device, User, dbConnection } = require('../models')


const THROTTLE = parseInt(process.env.LOCATION_THROTTLE_MS) || 5000

exports.uploadLocation = catchAsync(async (req, res) => {
  const deviceId = req.device.id
  const transaction = await dbConnection.transaction()

  const { latitude, longitude, accuracy, altitude, speed, timestamp, source } = req.body
  if (!latitude || !longitude) { throw new AppError('Latitude and longitude required', 400) }

  const device = await Device.findByPk(deviceId, { transaction })
  if (!device) { throw new AppError('Device not found', 404) }

  // Throttle before opening transaction
  if (device.lastSeen && Date.now() - device.lastSeen.getTime() < THROTTLE) {return res.status(200).json({ success: true }) }

  try {
    const pingTime = timestamp ? new Date(timestamp) : new Date()

    await Location.create({ deviceId, latitude, longitude, accuracy, altitude, speed, timestamp: pingTime, source}, { transaction })
    await device.update({ lastLatitude: latitude, lastLongitude: longitude, lastSeen: pingTime, status: 'Online' }, { transaction })
    await transaction.commit()

    res.status(200).json({ success: true, message: 'Ping received' })
  } 
  catch (error) {
    await transaction.rollback()
    throw error
  }
})

exports.getLiveLocation = async (req, res) => {
  try {
    const parentUserId = req.user.id
    const { deviceId, userId } = req.query;

    // const locations = await Location.findAll({
    //   where: deviceId ? { deviceId } : {},
    //   include: [
    //     {
    //       model: Device, attributes: ["id", "userId"], where: userId ? { userId } : {},
    //       include: [ { model: User, attributes: ["id", "firstName", "lastName"] } ]
    //     }
    //   ],
    //   order: [["timestamp", "DESC"]]
    // })

    const locations = await Location.findAll({
    where: deviceId ? { deviceId } : {},
    include: [
      {
        model: Device, attributes: ["id", "userId"], where: userId ? { userId } : {},
        include: [ { model: User, attributes: ["id", "userName"],
          include: [ { model: Family, as: 'families', attributes: ["id", "createdBy"], where: { createdBy: parentUserId }, through: { attributes: [] }
                  }
                ]
              }
            ]
          }
        ],
    order: [["timestamp", "DESC"]]
  })


    const latestLocations = [];
    const seenDevices = new Set()

    for (const loc of locations) {
      if (!seenDevices.has(loc.deviceId)) {
        seenDevices.add(loc.deviceId)

        latestLocations.push({
          deviceId: loc.deviceId,
          userId: loc.Device.userId,
          userName: loc.Device.User.userName,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          timestamp: loc.timestamp,
          address: loc.address
        })
      }
    }

    return res.status(200).json({ success: true, locations: latestLocations })
  } 
  catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch live locations", error: error.message })
  }
}


exports.getLocationHistory = catchAsync(async (req, res) => {
  const parentId = req.user.id
  const { deviceId, startDate, endDate, limit = 100 } = req.query

  if (!deviceId) { throw new AppError('deviceId is required', 400) }

  const parsedLimit = Math.min(parseInt(limit) || 100, 500)

  const device = await Device.findOne({ where: { id: deviceId }, attributes: ['id', 'userId'] })
  if (!device) { throw new AppError('Device not found', 404) }
  if (!device.userId) { throw new AppError('Device not assigned', 400) }

  const childUserId = device.userId;

  const parentFamilies = await FamilyMember.findAll({ where: { userId: parentId }, attributes: ['familyId'] })
  if (!parentFamilies.length) { throw new AppError('Not authorized', 403) }

  const familyIds = parentFamilies.map(f => f.familyId);

  const childMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId: familyIds }})
  if (!childMembership) { throw new AppError('Not authorized to view this device', 403) }

  //       ---------------------------------

  // const device = await Device.findOne({ 
  //       where: { id: deviceId }, 
  //       include: [{ model: User, required: true,
  //         include: [ { model: Family, required: true, through: { attributes: [] },
  //           include: [ { model: User, required: true, through: { attributes: [] }, where: { id: parentId }} ]
  //         }
  //       ]
  //     }
  //   ]
  // })

  //       ---------------------------------

  //   const device = await Device.findOne({
  //   where: { id: deviceId },
  //   attributes: ['id', 'userId'],
  //   include: [ { model: User, attributes: ['id', 'userName'],
  //       include: [ { association: 'families', required: true,
  //           include: [ { association: 'members', attributes: [], where: { id: parentId }, required: true } ]
  //         }
  //       ]
  //     }
  //   ]
  // })

  // if (!device) { throw new AppError('Not authorized or device not found', 403) }
  const where = { deviceId }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp[Op.gte] = new Date(startDate)
    if (endDate) where.timestamp[Op.lte] = new Date(endDate)
  }

  const { rows, count } = await Location.findAndCountAll({
    where,
    limit: parsedLimit,
    order: [['timestamp', 'DESC']],
    attributes: ['latitude', 'longitude', 'timestamp', 'accuracy']
  })

  const history = rows.map(loc => ({
    latitude: loc.latitude,
    longitude: loc.longitude,
    timestamp: loc.timestamp,
    address: null // optional reverse geocoding later
  }))

  res.status(200).json({ success: true, history, total: count })
})



