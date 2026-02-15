require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const QRCode = require('qrcode')
const jwt = require('jsonwebtoken')
const { User, dbConnection, Family, FamilyMember, PairingCode, Device } = require('../models')

function createPairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const part = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

  return `${part()}-${part()}`
}

exports.generatePairingCode = catchAsync(async (req, res) => {
  const atomic = await dbConnection.transaction()

  try{
      const { memberUserId, deviceName, deviceType, platform } = req.body
      const parentId = req.user.id

      if (req.user.role !== 'Parent') {
        throw new AppError('Only parents can generate pairing codes', 403, 'PARENT_ROLE_REQUIRED')
      }

      const family = await Family.findOne({ where: { createdBy: parentId }, atomic })
      if (!family) { throw new AppError('No family found', 404, 'FAMILY_NOT_FOUND') }
      
      const familyMember = await FamilyMember.findOne({ where: { familyId: family.id, userId: memberUserId }, atomic })
      if (!familyMember) { throw new AppError('Not a member of the family', 403, 'NOT_IN_FAMILY')}

      const alreadyPaired = await Device.findOne({ where: { userId: memberUserId, pairStatus: 'Paired'}, atomic })
      if (alreadyPaired) { throw new AppError('Member already has a paired device', 400, 'DEVICE_ALREADY_PAIRED') }

      await PairingCode.update({ status: 'Expired' }, { where: { assignedUserId: memberUserId, status: 'Pending'}, atomic })

      const code = createPairingCode()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await PairingCode.create({
        code,
        familyId: family.id,
        assignedUserId: memberUserId,
        deviceName,
        deviceType,
        platform,
        expiresAt
      }, { transaction: atomic })

      // deviceType is an ENUM, has to be verified
      // await Promise.all(permissions.map(p => DevicePermission.upsert({ deviceId, key: p, granted: false }, { transaction: atomic })))

      await atomic.commit()

      const qrPayload = JSON.stringify({ type: 'PAIR_DEVICE', code })
      const qrCode = await QRCode.toDataURL(qrPayload)

      res.status(201).json({ pairingCode: code, qrCode, expiresAt })
  }
  catch(err){
    await atomic.rollback()
    throw err
  }
})


exports.pairDevice = catchAsync(async (req, res) => {
  const { code } = req.body
  const transaction = await dbConnection.transaction()

  try{
    const pairingCode = await PairingCode.findOne({ where: { code, status: 'Pending' }, lock: transaction.LOCK.UPDATE, transaction })

    if (!pairingCode){
      await transaction.rollback()
      throw new AppError('Pairing Code Is Invalid', 400, 'PAIRING_CODE_INVALID')
    }

    if (pairingCode.expiresAt < new Date()) {
      await pairingCode.update({ status: 'Expired' }, { transaction })
      throw new AppError('Pairing Code Expired', 400, 'PAIRING_CODE_INVALID')
    }

        const alreadyPaired = await Device.findOne({ where: { userId: pairingCode.assignedUserId, pairStatus: 'Paired' }, transaction, lock: transaction.LOCK.UPDATE })
    if (alreadyPaired) { throw new AppError('Device already paired for this user', 400, 'DEVICE_ALREADY_PAIRED') }

    const device = await Device.create({
      deviceName: pairingCode.deviceName,
      userId: pairingCode.assignedUserId,
      type: pairingCode.deviceType,
      status: 'Offline',
      pairStatus: 'Paired',
      pairedAt: new Date()
    }, { transaction })

    await pairingCode.update({ status: 'Paired', deviceId: device.id, usedAt: new Date() }, { transaction })
    await transaction.commit()

    const deviceToken = jwt.sign({ deviceId: device.id }, process.env.DEVICE_SECRET, { expiresIn: '365d' })

    res.status(201).json({ success: true, message: 'Device paired successfully', deviceToken })
  }
  catch(error){
    if (!transaction.finished) {
      await transaction.rollback()
    }
    throw error
  }
})

exports.viewDevices = async (req, res, next) => {
  const atomic = await dbConnection.transaction()
  try {
    const userId = req.user.id
    const devices = await Device.findAll({ where: { userId } })

    if (!devices.length) {
      await transaction.rollback()
      throw new AppError('No devices found', 404, 'NO_DEVICES_FOUNND')
    }

    res.status(200).json({ devices })
  } 
  catch (error) {
    await atomic.rollback()
    throw error
  }
}

exports.getPairingCodeStatus = catchAsync(async (req, res) => {
  let { code } = req.params
  code = code.toUpperCase()

  if (!code) { throw new AppError('Pairing code is required', 400) }

  const pairingCode = await PairingCode.findOne({ where: { code }, include: [ { model: Device, attributes: ['id',     
                                                        'deviceName', 'type', 'status', 'pairStatus'] } ] })

  if (!pairingCode) { throw new AppError('Invalid pairing code', 404) }
  const now = new Date()

  if (pairingCode.expiresAt < now && pairingCode.status === 'Pending') {
    await pairingCode.update({ status: 'Expired' })
  }

  if (pairingCode.status === 'Expired') {
    return res.status(200).json({ success: true, pairStatus: 'expired' }) 
  }

  if (pairingCode.status === 'Paired' && pairingCode.Device) { return res.status(200).json({
      success: true, pairStatus: 'paired',
      device: {
        id: pairingCode.Device.id,
        name: pairingCode.Device.deviceName,
        type: pairingCode.Device.type,
        status: pairingCode.Device.status?.toLowerCase()
      } })
  }
  const expiresInSeconds = Math.max(0,Math.floor((pairingCode.expiresAt - now) / 1000))

  return res.status(200).json({ success: true, pairStatus: 'pending', expiresInSeconds })
})

exports.getAllDevices = catchAsync(async (req, res) => {
  const { pairStatus = 'all', limit = 50, offset = 0 } = req.query

  const parsedLimit = Math.min(parseInt(limit) || 50, 100)
  const parsedOffset = parseInt(offset) || 0
  const where = {}

  if (pairStatus !== 'all') { where.pairStatus = pairStatus.charAt(0).toUpperCase() + pairStatus.slice(1) }

  const { rows, count } = await Device.findAndCountAll({ where, limit: parsedLimit, offset: parsedOffset, order: [['createdAt', 'DESC']],
    attributes: [ 'id', 'deviceName', 'type', 'deviceModel', 'platform', 'status', 'pairStatus', 'batteryLevel', 'isCharging', 'lastSeen', 'lastLatitude', 'lastLongitude'],
    include: [ { model: User, attributes: ['id', 'userName'] } ] })

  const devices = rows.map(device => ({
    id: device.id,
    name: device.deviceName,
    type: device.type,
    deviceModel: device.deviceModel,
    platform: device.platform,
    status: device.status?.toLowerCase(),
    pairStatus: device.pairStatus?.toLowerCase(),
    batteryLevel: device.batteryLevel,
    isCharging: device.isCharging,
    lastSeen: device.lastSeen,
    lastLocation: device.lastLatitude && device.lastLongitude ? { latitude: device.lastLatitude, longitude: device.lastLongitude } : null,
    assignedUser: device.User ? { id: device.User.id, name: device.User.userName } : null
  }))

  res.status(200).json({ success: true, devices, total: count, limit: parsedLimit, offset: parsedOffset })
})


exports.getFamilyDevices = catchAsync(async (req, res) => {
  const { pairStatus = 'all', limit = 50, offset = 0 } = req.query
  const parentId = req.user.id

  const parsedLimit = Math.min(parseInt(limit) || 50, 100)
  const parsedOffset = parseInt(offset) || 0

  const family = await Family.findOne({ where: { createdBy: parentId }})
  if (!family) { throw new AppError('Family not found', 404) }

  const members = await FamilyMember.findAll({ where: { familyId: family.id }, attributes: ['userId'] })
  const memberUserIds = members.map(m => m.userId)

  const where = { userId: memberUserIds }
  if (pairStatus !== 'all') { where.pairStatus = pairStatus.charAt(0).toUpperCase() + pairStatus.slice(1) }

  const { rows, count } = await Device.findAndCountAll({
    where,
    limit: parsedLimit,
    offset: parsedOffset,
    order: [['createdAt', 'DESC']],
    attributes: [
      'id',
      'deviceName',
      'type',
      'deviceModel',
      'platform',
      'status',
      'pairStatus',
      'batteryLevel',
      'isCharging',
      'lastSeen',
      'lastLatitude',
      'lastLongitude'
    ],
    include: [
      {
        model: User,
        attributes: ['id', 'userName']
      }
    ]
  })

  const devices = rows.map(device => ({
    id: device.id,
    name: device.deviceName,
    type: device.type,
    deviceModel: device.deviceModel,
    platform: device.platform,
    status: device.status?.toLowerCase(),
    pairStatus: device.pairStatus?.toLowerCase(),
    batteryLevel: device.batteryLevel,
    isCharging: device.isCharging,
    lastSeen: device.lastSeen,
    lastLocation:
      device.lastLatitude && device.lastLongitude
        ? {
            latitude: device.lastLatitude,
            longitude: device.lastLongitude
          }
        : null,
    assignedUser: device.User
      ? {
          id: device.User.id,
          name: device.User.userName
        }
      : null
  }))

  res.status(200).json({
    success: true,
    devices,
    total: count,
    limit: parsedLimit,
    offset: parsedOffset
  })
})


exports.getSingleDevice = catchAsync(async (req, res) => {
  try{
    const { deviceId } = req.params
    const parentId = req.user.id

    const family = await Family.findOne({ where: { createdBy: parentId }})
    if (!family) { throw new AppError('Family not found', 404) }

    const members = await FamilyMember.findAll({ where: { familyId: family.id }, attributes: ['userId'] })
    const memberUserIds = members.map(m => m.userId)

    const device = await Device.findOne({ where: { id: deviceId },
      attributes: ['id', 'deviceName', 'userId', 'type', 'platform', 'deviceModel', 'brand', 'osVersion', 'appVersion', 'status', 'batteryLevel', 'isCharging', 'lastSeen', 'lastLatitude', 'lastLongitude', 'locationAccuracy', 'locationTimestamp', 'pairedAt'
      ],
      include: [ { model: User, attributes: ['id', 'userName'] } ]})

    if (!device) { throw new AppError('Device not found', 404) }
    if(!memberUserIds.includes(device.userId)){ throw new AppError('You can see device of only your family members', 400) }

    const formattedDevice = {
      id: device.id,
      name: device.deviceName,
      type: device.type,
      deviceType: device.deviceType,
      platform: device.platform,
      model: device.model,
      brand: device.brand,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      status: device.status?.toLowerCase(),
      batteryPercentage: device.batteryPercentage,
      isCharging: device.isCharging,
      lastSeen: device.lastSeen,
      lastLocation:
        device.lastLatitude !== null &&
        device.lastLongitude !== null
          ? {
              latitude: device.lastLatitude,
              longitude: device.lastLongitude,
              accuracy: device.locationAccuracy,
              timestamp: device.locationTimestamp
            }
          : null,
      assignedUser: device.User ? { id: device.User.id, name: device.User.userName } : null,
      pairedAt: device.pairedAt
    }

    res.status(200).json({ success: true, device: formattedDevice })
  }
  catch(err){
    throw err
  }
})

exports.updateDevice = catchAsync(async (req, res) => {
  const { deviceId } = req.params
  const { name, assignedUserId } = req.body
  const loggedInUserId = req.user.id
  const transaction = await dbConnection.transaction()

  try {
    const user = await User.findByPk(assignedUserId, { transaction })
    if (!user) { throw new AppError('Assigned user not found', 404) }

    const family = await Family.findOne({ where: { createdBy: loggedInUserId }, transaction })
    if (!family) { throw new AppError('You do not have a family created', 403) }

    const membership = await FamilyMember.findOne({ where: { familyId: family.id, userId: user.id }, transaction })
    if (!membership) { throw new AppError('This user is not part of your family', 403) }

    const device = await Device.findOne({ where: { id: deviceId }, transaction, lock: transaction.LOCK.UPDATE })
    if (!device) { throw new AppError('Device not found', 404) }
    if (name) { device.deviceName = name }

    if (assignedUserId) {
      const existingDevice = await Device.findOne({ where: { userId: user.id, pairStatus: 'Paired' }, transaction })
      if (existingDevice && existingDevice.id !== device.id) { throw new AppError('This user already has a paired device', 400 ) }

      device.userId = assignedUserId
    }

    await device.save({ transaction })
    await transaction.commit()

    res.status(200).json({ success: true, device: { id: device.id, name: device.deviceName, assignedUserId: device.userId } })
  } 
  catch (err) {
    if (!transaction.finished) await transaction.rollback()
    throw err
  }
})

exports.removeDevice = catchAsync(async (req, res) => {
  const { deviceId } = req.params
  const loggedInUserId = req.user.id
  const transaction = await dbConnection.transaction()

  try {
    const family = await Family.findOne({ where: { createdBy: loggedInUserId }, transaction })
    if (!family) { throw new AppError('You do not have a family created', 403) }

    const device = await Device.findOne({ where: { id: deviceId }, transaction, lock: transaction.LOCK.UPDATE })
    if (!device) { throw new AppError('Device not found', 404) }

    const membership = await FamilyMember.findOne({ where: { familyId: family.id, userId: device.userId }, transaction })
    if (!membership) { throw new AppError('This user is not part of your family', 403) }

    if (device.pairStatus !== 'Paired') { throw new AppError('Device is not currently paired', 400) }

    await device.destroy({ transaction })
    await transaction.commit()

    res.status(200).json({ success: true, message: 'Device removed successfully' })
  } 
  catch (err) {
    if (!transaction.finished) await transaction.rollback()
    throw err
  }
})
