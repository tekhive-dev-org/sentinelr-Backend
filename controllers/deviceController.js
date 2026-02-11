require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const QRCode = require('qrcode')
const jwt = require('jsonwebtoken')
const { DevicePermission, dbConnection, Family, FamilyMember, PairingCode, Device } = require('../models')

function createPairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

  return `${part()}-${part()}`
}

exports.generatePairingCode = catchAsync(async (req, res) => {
  const atomic = await dbConnection.transaction()

  try{
      const { childUserId, deviceName, deviceType } = req.body
      const parentId = req.user.id

      // permissions = ['camera', 'location', 'microphone']

      if (req.user.role !== 'Parent') {
        throw new AppError('Only parents can generate pairing codes', 403, 'PARENT_ROLE_REQUIRED')
      }

      const family = await Family.findOne({ where: { createdBy: parentId }, transaction: atomic })
      if (!family) { throw new AppError('No family found', 403, 'FAMILY_NOT_FOUND') }
      
      const familyMember = await FamilyMember.findOne({ where: { familyId: family.id, userId: childUserId, relationship: 'Child' }, atomic })
      if (!familyMember) { throw new AppError('Child not found in your family', 403, 'CHILD_NOT_IN_FAMILY')}

      if (familyMember.status === 'Active') { throw new AppError('Child already has a paired device', 400, 'DEVICE_ALREADY_PAIRED') }

      await PairingCode.update({ status: 'Expired' }, { where: { assignedUserId: childUserId, status: 'Pending'}, atomic })

      const code = createPairingCode()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await PairingCode.create({
        code,
        familyId: family.id,
        assignedUserId: childUserId,
        deviceName,
        deviceType,
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
    const pairingCode = await PairingCode.findOne({ where: { code, status: 'Pending' }, transaction, lock: transaction.LOCK.UPDATE })

    if (!pairingCode){
      await transaction.rollback()
      throw new AppError('Pairing Code Is Invalid', 400, 'PAIRING_CODE_INVALID')
    }

    if (pairingCode.expiresAt < new Date()) {
      await pairingCode.update({ status: 'Expired' }, { transaction })
      await transaction.commit()
      throw new AppError('Pairing Code Expired', 400, 'PAIRING_CODE_INVALID')
    }

    const device = await Device.create({
      deviceName: pairingCode.deviceName,
      userId: pairingCode.assignedUserId,
      type: pairingCode.deviceType,
      status: 'Offline',
      pairedAt: new Date()
    }, { transaction })

    await pairingCode.update({ status: 'Paired', deviceId: device.id, usedAt: new Date() }, { transaction })
    
    // await DevicePermission.update(             await DevicePermission.bulkCreate([], { transaction })
    //   { granted: true },
    //   { where: { deviceId: device.id } }
    // )
    const [updatedCount] = await FamilyMember.update({ status: 'Active' }, { where: { familyId: pairingCode.familyId, userId: pairingCode.assignedUserId }, transaction })
    if (updatedCount === 0) { throw new AppError('Family member not found', 404) }
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

exports.checkPairingCodeStatus = catchAsync(async (req, res) => {
  const { code } = req.params
  const pairingCode = await PairingCode.findOne({ where: { code } })

  if (!pairingCode) { return res.status(404).json({ valid: false, status: 'Invalid' }) }
  if (pairingCode.status === 'Pending' && pairingCode.expiresAt < new Date()) { await pairingCode.update({ status: 'Expired' }) }

  return res.status(200).json({
    valid: pairingCode.status === 'Pending',
    status: pairingCode.status,
    expiresAt: pairingCode.expiresAt,
    deviceName: pairingCode.deviceName,
    deviceType: pairingCode.deviceType
  })
})

exports.listDevices = catchAsync(async (req, res) => {
  const user = req.user
  let where = {}

  if (user.role === 'Child') { where.userId = user.id }
  if (user.role === 'Parent') {
    const family = await Family.findOne({ where: { createdBy: user.id } })

    if (!family) { throw new AppError('Family not found', 404) }

    const members = await FamilyMember.findAll({ where: { familyId: family.id, relationship: 'Child', status: 'Active'}, attributes: ['userId'] })
    const childIds = members.map(m => m.userId)

    where.userId = childIds
  }

  const devices = await Device.findAll({ 
    where,
    attributes: ['deviceName', 'type', 'status', 'pairedAt', 'lastSeen'], 
    order: [['createdAt', 'DESC']]
  })

  res.status(200).json({ success: true, count: devices.length, devices })
})

exports.getDevice = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = req.user

  const device = await Device.findByPk(id)

  if (!device) { throw new AppError('Device not found', 404) }
  
  if (user.role === 'Child') {
    if (device.userId !== user.id) { throw new AppError('Access denied', 403) }
  }

  if (user.role === 'Parent') {
    const family = await Family.findOne({ where: { createdBy: user.id } })
    const member = await FamilyMember.findOne({ where: { familyId: family.id, userId: device.userId }})
    if (!member) { throw new AppError('Access denied', 403)}
  }

  res.status(200).json({ success: true, device })
})

exports.removeDevice = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = req.user
  const transaction = await dbConnection.transaction()

  try {
    const device = await Device.findByPk(id, { transaction })

    if (!device) { throw new AppError('Device not found', 404) }

    if (user.role === 'Child' && device.userId !== user.id) { throw new AppError('Access denied', 403) }

    if (user.role === 'Parent') {
      const family = await Family.findOne({ where: { createdBy: user.id }, transaction })
      const member = await FamilyMember.findOne({ where: { familyId: family.id, userId: device.userId }, transaction })

      if (!member) { throw new AppError('Access denied', 403) }

      await member.update({ status: 'Inactive' }, { transaction })
    }

    await device.update({ status: 'Removed', deletedAt: new Date() }, { transaction })
    await PairingCode.update({ deviceId: null }, { where: { deviceId: device.id }, transaction })
    await transaction.commit()

    res.status(200).json({ success: true, message: 'Device unpaired successfully' })
  } 
  catch (err) {
    if (!transaction.finished) { await transaction.rollback() }
    throw err
  }
})





