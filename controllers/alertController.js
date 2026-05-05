const { Op } = require("sequelize")
const { Alert, User, Device, dbConnection } = require("../models")
const catchAsync = require("../utils/catchAsync")




exports.getAllAlerts = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { type = "all", status = "all", startDate, endDate, limit = 20, offset = 0 } = req.query

    const where = { userId: loggedInUserId }

    if (type !== "all") { where.type = type }
    if (status !== "all") { where.status = status}

    if (startDate && endDate) { where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] } } 
    else if (startDate) { where.createdAt = { [Op.gte]: new Date(startDate) } }
    else if (endDate) { where.createdAt = { [Op.lte]: new Date(endDate) } }

    const { rows: alerts, count: total } = await Alert.findAndCountAll({
      where,
      include: [{ model: User, attributes: ["id", "name"] },{ model: Device, attributes: ["id"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      transaction
    })

    await transaction.commit()

    res.status(200).json({
      success: true,
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        status: a.status,
        priority: a.priority,
        deviceId: a.deviceId,
        userId: a.userId,
        userName: a.User?.name,
        location: a.location ? {
          latitude: a.location.latitude,
          longitude: a.location.longitude,
          address: a.location.address
        } : null,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt
      })),
      total
    })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.getSOSAlerts = catchAsync(async (req, res) => {
  try {
    const loggedInUserId = req.user.id

    const alerts = await Alert.findAll({
      where: { userId: loggedInUserId, type: "sos" },
      include: [{ model: User, attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]]
    })

    const activeSOSCount = alerts.filter(a => a.status === "active").length

    res.status(200).json({
      success: true,
      activeSOSCount,
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        status: a.status,
        priority: a.priority,
        deviceId: a.deviceId,
        userId: a.userId,
        userName: a.User?.name,
        location: a.location,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt
      }))
    })
  } 
  catch (error) { throw error }
})

exports.resolveAlert = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { alertId } = req.params
    const { resolution, status } = req.body

    const alert = await Alert.findOne({ where: { id: alertId }, transaction })
    if (!alert) throw new AppError("Alert not found", 404)

    alert.status = status || "resolved"
    alert.description = `${alert.description}\nResolution: ${resolution}`
    alert.resolvedAt = new Date()

    await alert.save({ transaction })
    await transaction.commit()

    try {
      await ParentalControlActivity.create({
        actingUserId: loggedInUserId,
        deviceUserId: alert.userId,
        deviceId: alert.deviceId,
        type: "resolve_alert",
        description: resolution,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("Failed to log resolve_alert activity:", logError)
    }

    res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      alert: {
        id: alert.id,
        type: alert.type,
        status: alert.status,
        resolution,
        resolvedAt: alert.resolvedAt
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})


exports.dismissAlert = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { alertId } = req.params

    const alert = await Alert.findOne({ where: { id: alertId }, transaction })
    if (!alert) throw new AppError("Alert not found", 404)

    alert.status = "cancelled"
    alert.resolvedAt = new Date()

    await alert.save({ transaction })
    await transaction.commit()

    try {
      await ParentalControlActivity.create({
        actingUserId: loggedInUserId,
        deviceUserId: alert.userId,
        deviceId: alert.deviceId,
        type: "dismiss_alert",
        description: "Alert dismissed/cancelled",
        timestamp: new Date()
      })
    } 
    catch (logError) {
      console.error("Failed to log dismiss_alert activity:", logError)
    }

    res.status(200).json({
      success: true,
      message: "Alert dismissed successfully",
      alert: {
        id: alert.id,
        type: alert.type,
        status: alert.status,
        resolvedAt: alert.resolvedAt
      }
    })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error
  }
})

exports.triggerSOS = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const deviceUserId = req.device.userId
    const { location, message } = req.body
    const deviceId = req.device.id

    const alert = await Alert.create({
      type: "sos",
      title: "SOS Alert",
      description: message || "Emergency alert triggered",
      status: "active",
      priority: "high",
      deviceId,
      userId: deviceUserId,
      location,
      createdAt: new Date()
    }, { transaction })

    await transaction.commit()

    try {
      await ParentalControlActivity.create({
        actingUserId: deviceUserId,
        deviceUserId,
        deviceId,
        type: "trigger_sos",
        description: message || "SOS triggered",
        timestamp: new Date()
      })
    } 
    catch (logError) {
      console.error("Failed to log trigger_sos activity:", logError)
    }

    res.status(201).json({
      success: true,
      message: "SOS alert triggered successfully",
      alert: {
        id: alert.id,
        type: alert.type,
        status: alert.status,
        priority: alert.priority,
        deviceId: alert.deviceId,
        userId: alert.userId,
        location: alert.location,
        createdAt: alert.createdAt
      }
    })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})





