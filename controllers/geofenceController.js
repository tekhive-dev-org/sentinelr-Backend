require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { dbConnection, User, Family, FamilyMember, Geofence, GeofenceUser, GeofenceEvent, Device } = require('../models')

exports.createGeofence = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const parentId = req.user.id
    const { name, type, center, radius, address, notifyOnEntry, notifyOnExit, assignedUserIds = [], schedule } = req.body

    if (!name || !center?.latitude || !center?.longitude || !radius) { throw new AppError("Missing required geofence fields", 400) }

    const family = await Family.findOne({ where: { createdBy: parentId }, transaction })
    if (!family) { throw new AppError('You do not have a family created', 403) }

    // there is more than one parent in the family & a Parent might not be the person who created the family
    // const membership = await FamilyMember.findOne({ where: { userId: parentId, familyId: family.id, relationship: 'Parent'},transaction })
    // if (!membership) { throw new AppError('You are not a parent in this family', 403) }


    if (assignedUserIds.length) {
      const validMembers = await FamilyMember.findAll({ where: { userId: assignedUserIds, familyId: family.id }, attributes: ["userId"], transaction })

      if (validMembers.length !== assignedUserIds.length) { throw new AppError("Some assigned users are outside your family", 403) }
    }

    const geofence = await Geofence.create({
      familyId: family.id,
      name,
      type,
      centerLatitude: center.latitude,
      centerLongitude: center.longitude,
      radius,
      address,
      notifyOnEntry,
      notifyOnExit,
      scheduleEnabled: schedule?.enabled || false,
      scheduleDays: schedule?.days || null,
      scheduleStartTime: schedule?.startTime || null,
      scheduleEndTime: schedule?.endTime || null
    }, { transaction })


    if (assignedUserIds.length) {
      const rows = assignedUserIds.map(userId => ({ geofenceId: geofence.id, userId }))
      await GeofenceUser.bulkCreate(rows, { transaction })
    }

    await transaction.commit()

    res.status(201).json({
      success: true,
      message: "Geofence created successfully",
      geofence: {
        id: geofence.id,
        name: geofence.name,
        type: geofence.type,
        center: {
          latitude: geofence.centerLatitude,
          longitude: geofence.centerLongitude
        },
        radius: geofence.radius,
        address: geofence.address,
        notifyOnEntry: geofence.notifyOnEntry,
        notifyOnExit: geofence.notifyOnExit,
        assignedUsers: assignedUserIds,
        schedule: schedule || { enabled: false },
        createdAt: geofence.createdAt
      }
    })
  }
  catch (error) {
    if (!transaction.finished) { await transaction.rollback()}
    throw error
  }
})

exports.getGeofences = catchAsync(async (req, res) => {
  const parentId = req.user.id

  const parentMembership = await FamilyMember.findOne({ where: { userId: parentId, relationship: 'Parent' }, attributes: ['familyId'] })
  if (!parentMembership) { throw new AppError('Only parents can view geofences', 403) }

  const familyId = parentMembership.familyId

  const geofences = await Geofence.findAll({ where: { familyId },
    include: [{ model: User, attributes: ['id'], through: { attributes: [] } } ], order: [['createdAt', 'DESC']] })

  const formattedGeofences = geofences.map(g => ({
    id: g.id,
    name: g.name,
    type: g.type,
    center: {
      latitude: g.centerLatitude,
      longitude: g.centerLongitude
    },
    radius: g.radius,
    address: g.address,
    isActive: g.isActive,
    notifyOnEntry: g.notifyOnEntry,
    notifyOnExit: g.notifyOnExit,
    assignedUsers: g.Users.map(u => u.id),
    schedule: {
      enabled: g.scheduleEnabled,
      days: g.scheduleDays || [],
      startTime: g.scheduleStartTime,
      endTime: g.scheduleEndTime
    },
    createdAt: g.createdAt
  }))

  res.status(200).json({ success: true, geofences: formattedGeofences })
})

exports.updateGeofence = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const parentId = req.user.id
    const { geofenceId } = req.params
    const { name, type, center, radius, address, notifyOnEntry, notifyOnExit, assignedUserIds = [], schedule } = req.body

    const parentMembership = await FamilyMember.findOne({
      where: { userId: parentId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })

    if (!parentMembership) { throw new AppError("Only parents can update geofences", 403) }
    const familyId = parentMembership.familyId

    const geofence = await Geofence.findOne({ where: { id: geofenceId, familyId }, transaction })
    if (!geofence) { throw new AppError("Geofence not found", 404) }

    if (assignedUserIds.length) {
      const members = await FamilyMember.findAll({ where: { familyId, userId: assignedUserIds }, attributes: ["userId"], transaction })

      if (members.length !== assignedUserIds.length) { throw new AppError("Some users are not members of this family", 403) }
    }


    await geofence.update({
      name: name ?? geofence.name,
      type: type ?? geofence.type,
      centerLatitude: center?.latitude ?? geofence.centerLatitude,
      centerLongitude: center?.longitude ?? geofence.centerLongitude,
      radius: radius ?? geofence.radius,
      address: address ?? geofence.address,
      notifyOnEntry: notifyOnEntry ?? geofence.notifyOnEntry,
      notifyOnExit: notifyOnExit ?? geofence.notifyOnExit,
      scheduleEnabled: schedule?.enabled ?? geofence.scheduleEnabled,
      scheduleDays: schedule?.days ?? geofence.scheduleDays,
      scheduleStartTime: schedule?.startTime ?? geofence.scheduleStartTime,
      scheduleEndTime: schedule?.endTime ?? geofence.scheduleEndTime
    }, { transaction })


    if (assignedUserIds) {
      await GeofenceUser.destroy({ where: { geofenceId }, transaction })
      const rows = assignedUserIds.map(userId => ({ geofenceId,  userId }))
      await GeofenceUser.bulkCreate(rows, { transaction })
    }

    await transaction.commit()
    res.status(200).json({ success: true,  message: "Geofence updated successfully" })
  }
  catch (error) {
    if (!transaction.finished) { await transaction.rollback() }
    throw error
  }
})

exports.deleteGeofence = catchAsync(async (req, res) => {
  const { geofenceId } = req.params
  const parentId = req.user.id

  const parentMembership = await FamilyMember.findOne({ where: { userId: parentId, relationship: "Parent" }, attributes: ["familyId"] })
  if (!parentMembership) { throw new AppError("Only parents can delete geofences", 403) }

  const geofence = await Geofence.findOne({ where: { id: geofenceId, familyId: parentMembership.familyId } })
  if (!geofence) { throw new AppError("Geofence not found", 404) }

  await geofence.destroy()

  res.status(200).json({ success: true, message: "Geofence deleted successfully" })
})

exports.toggleGeofence = catchAsync(async (req, res) => {
  const { geofenceId } = req.params
  const { isActive } = req.body
  const parentId = req.user.id

  if (typeof isActive !== "boolean") { throw new AppError("isActive must be boolean", 400) }
  const parentMembership = await FamilyMember.findOne({ where: { userId: parentId, relationship: "Parent" }, attributes: ["familyId"] })

  if (!parentMembership) { throw new AppError("Only parents can update geofences", 403) }
  const geofence = await Geofence.findOne({ where: { id: geofenceId, familyId: parentMembership.familyId } })

  if (!geofence) { throw new AppError("Geofence not found", 404) }
  geofence.isActive = isActive
  await geofence.save()

  res.status(200).json({ success: true, message: "Geofence status updated", isActive: geofence.isActive })
})

exports.getGeofenceEvents = catchAsync(async (req, res) => {
  const parentId = req.user.id
  const { geofenceId } = req.params

  const parentMembership = await FamilyMember.findOne({ where: { userId: parentId, relationship: "Parent" }, attributes: ["familyId"]})

  if (!parentMembership) {
    throw new AppError("Only parents can view geofence events", 403)
  }

  const geofence = await Geofence.findOne({
    where: {
      id: geofenceId,
      familyId: parentMembership.familyId
    }
  })

  if (!geofence) {
    throw new AppError("Geofence not found", 404)
  }


  const events = await GeofenceEvent.findAll({

    where: { geofenceId },

    include: [
      {
        model: Device,
        attributes: ["userId"],
        include: [
          {
            model: User,
            attributes: ["id", "userName"]
          }
        ]
      }
    ],

    order: [["createdAt", "DESC"]]
  })


  const formattedEvents = events.map(e => ({
    id: e.id,
    type: e.eventType.toLowerCase(),
    userId: e.Device.User.id,
    userName: `${e.Device.User.firstName} ${e.Device.User.lastName}`,
    timestamp: e.createdAt,
    location: {
      latitude: e.latitude,
      longitude: e.longitude
    }
  }))


  res.status(200).json({
    success: true,
    events: formattedEvents
  })

})