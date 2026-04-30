const { ParentalControls, FamilyMember, Device, ParentalControlActivity } = require("../models");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const dbConnection = require("../config/database");


exports.getParentalControls = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { userId } = req.params
    const { deviceId } = req.query

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) { throw new AppError("Only parents can access parental controls", 403, "NOT_PARENT") }
    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) { throw new AppError("Target user is not in your family", 403, "NOT_SAME_FAMILY") }

    const where = { userId }
    if (deviceId) where.deviceId = deviceId

    const controls = await ParentalControls.findOne({ where, include: [ { model: Device, attributes: ["id", "deviceName"] } ], transaction })
    if (!controls) { throw new AppError("Parental controls not found", 404, "PARENTAL_CONTROLS_NOT_FOUND") }

    await transaction.commit()
    res.status(200).json({
      success: true,
      controls: {
        userId: controls.userId,
        deviceId: controls.deviceId,
        deviceName: controls.Device?.deviceName,
        isMonitoring: controls.isMonitoring,
        screenTimeLimit: controls.screenTime,
        appBlocking: controls.appBlocking,
        webFiltering: controls.webFiltering,
        bedtime: controls.bedtime,
        quickPause: controls.quickPause
      }
    })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.updateScreenTime = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { enabled, dailyLimit, schedule } = req.body

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) { throw new AppError("Only parents can update screen time", 403, "NOT_PARENT") }

    const familyId = parentMembership.familyId;

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) { throw new AppError("Target user is not in your family", 403, "NOT_SAME_FAMILY")}

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) { throw new AppError("Parental controls not found", 404, "PARENTAL_CONTROLS_NOT_FOUND") }

    const newScreenTime = {
      enabled: enabled ?? controls.screenTime?.enabled,
      dailyLimit: dailyLimit ?? controls.screenTime?.dailyLimit,
      schedule: {
        weekdays: schedule?.weekdays ?? controls.screenTime?.schedule?.weekdays,
        weekends: schedule?.weekends ?? controls.screenTime?.schedule?.weekends
      }
    }

    await controls.update({ screenTime: newScreenTime }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "screen_time_update", description: "Screen time settings updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log screen_time_update activity:", logError)
    }
    res.status(200).json({ success: true, message: "Screen time settings updated" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
    finally {
    console.log("Finished processing updateScreenTime request")
  }
})

// More Like ADD Apps To Block
exports.updateAppBlocking = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { enabled, blockedApps = [], categoryBlocked = [] } = req.body

    const parentMembership = await FamilyMember.findOne({
      where: { userId: loggedInUserId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })
    if (!parentMembership) throw new AppError("Only parents can update app blocking", 403);
    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    const newAppBlocking = {
      enabled: enabled ?? controls.appBlocking?.enabled,
      blockedApps: blockedApps?.length ? [...new Set([...(controls.appBlocking?.blockedApps || []), ...blockedApps ])] : controls.appBlocking?.blockedApps || [],
      categoryBlocked: categoryBlocked?.length ? [...new Set([...(controls.appBlocking?.categoryBlocked || []), ...categoryBlocked])] : controls.appBlocking?.categoryBlocked || []
    }

    await controls.update({ appBlocking: newAppBlocking }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "app_blocking_update", description: "App blocking settings updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log app_blocking_update activity:", logError)
    }

    res.status(200).json({ success: true, message: "App blocking settings updated" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
  finally {
    console.log("Finished processing updateAppBlocking request")
  }
})

exports.toggleAppCategoryBlock = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { category, enabled } = req.body

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can update category blocking", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403);

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    let categories = controls.appBlocking?.categoryBlocked || []
    const idx = categories.findIndex(c => c.category === category)

    if (idx >= 0) { categories[idx].enabled = enabled } 
    else { categories.push({ category, enabled }) }

    const newAppBlocking = { ...controls.appBlocking, categoryBlocked: categories }

    await controls.update({ appBlocking: newAppBlocking }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "toggle_app_category_block", description: "App category blocking updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log toggle_app_category_block activity:", logError)
    }

    res.status(200).json({ success: true, message: "Category blocking updated", category, enabled })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
  finally {
    console.log("Finished processing toggleAppCategoryBlock request")
  }
})

exports.toggleIndividualAppBlock = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { packageName, isBlocked } = req.body

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can update app blocking", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    let appBlocking = controls.appBlocking || { enabled: false, blockedApps: [], categoryBlocked: [], appOverrides: [] }
    let overrides = appBlocking.appOverrides || []

    const idx = overrides.findIndex(app => app.packageName === packageName)
    if (idx >= 0) { overrides[idx].isBlocked = isBlocked } 
    else { overrides.push({ packageName, isBlocked }) }

    appBlocking.appOverrides = overrides

    await controls.update({ appBlocking }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "toggle_individual_app_block", description: "Individual app block status updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log toggle_individual_app_block activity:", logError)
    }

    res.status(200).json({ success: true, message: "App block status updated" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.updateWebFiltering = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { enabled, blockedSites = [], safeSearchEnabled, categoryBlocked = [] } = req.body;

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can update web filtering", 403);

    const familyId = parentMembership.familyId;
    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    const newWebFiltering = {enabled: enabled ?? controls.webFiltering?.enabled, blockedSites: blockedSites?.length ? [...new Set([...(controls.webFiltering?.blockedSites || []), ...blockedSites])]
            : controls.webFiltering?.blockedSites || [],
        safeSearchEnabled: safeSearchEnabled ?? controls.webFiltering?.safeSearchEnabled,
        categoryBlocked: categoryBlocked?.length ? [...new Set([...(controls.webFiltering?.categoryBlocked || []), ...categoryBlocked])]
            : controls.webFiltering?.categoryBlocked || []
    }

    await controls.update({ webFiltering: newWebFiltering }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "update_web_filtering", description: "Web filtering settings updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log update_web_filtering activity:", logError)
    }

    res.status(200).json({ success: true, message: "Web filtering settings updated" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.addBlockedWebsite = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { url } = req.body

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can add blocked websites", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    let webFiltering = controls.webFiltering || { enabled: false, blockedSites: [], safeSearchEnabled: false, categoryBlocked: [] }
    let sites = webFiltering.blockedSites || []

    if (!sites.includes(url)) { sites.push(url) }

    webFiltering.blockedSites = sites

    await controls.update({ webFiltering }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "add_blocked_website", description: "Website added to blocked list", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log add_blocked_website activity:", logError)
    }

    res.status(201).json({ success: true, message: "Website added to blocked list", blockedSites: sites })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error
  }
})

exports.removeBlockedWebsite = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { url } = req.body

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can remove blocked websites", 403)

    const familyId = parentMembership.familyId
    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    let webFiltering = controls.webFiltering || { enabled: false, blockedSites: [], safeSearchEnabled: false, categoryBlocked: [] }
    let sites = webFiltering.blockedSites || []

    sites = sites.filter(site => site !== url)
    webFiltering.blockedSites = sites;

    await controls.update({ webFiltering }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "remove_blocked_website", description: "Website removed from blocked list", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log remove_blocked_website activity:", logError)
    }

    res.status(200).json({ success: true, message: "Website removed from blocked list", blockedSites: sites })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.updateBedtime = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
    const { enabled, startTime, endTime } = req.body

    const parentMembership = await FamilyMember.findOne({
      where: { userId: loggedInUserId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })
    if (!parentMembership) throw new AppError("Only parents can update bedtime settings", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({
      where: { userId: childUserId, familyId },
      attributes: ["userId"],
      transaction
    })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    const newBedtime = {
      enabled: enabled ?? controls.bedtime?.enabled,
      startTime: startTime ?? controls.bedtime?.startTime,
      endTime: endTime ?? controls.bedtime?.endTime
    }

    await controls.update({ bedtime: newBedtime }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "update_bedtime", description: "Bedtime settings updated", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log update_bedtime activity:", logError)
    }

    res.status(200).json({ success: true, message: "Bedtime settings updated" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.freezeDevice = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params
  
    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can freeze devices", 403)
    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({ where: { userId: childUserId, familyId }, attributes: ["userId"], transaction })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found for this device", 404)

    const now = new Date();
    const newQuickPause = { isDeviceFrozen: true, frozenAt: now.toISOString(), frozenUntil: null }

    await controls.update({ quickPause: newQuickPause }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "freeze_device", description: "Device frozen", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log freeze_device activity:", logError)
    }

    res.status(200).json({ success: true, message: "Device frozen successfully", frozenAt: now.toISOString() })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})


exports.unfreezeDevice = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUserId = req.user.id
    const { childUserId, deviceId } = req.params

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can unfreeze devices", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({
      where: { userId: childUserId, familyId },
      attributes: ["userId"],
      transaction
    })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found for this device", 404)

    const newQuickPause = { isDeviceFrozen: false, frozenAt: null, frozenUntil: null }
    await controls.update({ quickPause: newQuickPause }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "unfreeze_device", description: "Device unfrozen", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log unfreeze_device activity:", logError)
    }

    res.status(200).json({ success: true, message: "Device unfrozen successfully" })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.grantBonusTime = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { childUserId } = req.params
    const { deviceId, minutes } = req.body

    const parentMembership = await FamilyMember.findOne({
      where: { userId: loggedInUserId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })
    if (!parentMembership) throw new AppError("Only parents can grant bonus time", 403)

    const familyId = parentMembership.familyId

    const targetMembership = await FamilyMember.findOne({
      where: { userId: childUserId, familyId },
      attributes: ["userId"],
      transaction
    })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found for this device", 404)

    let screenTime = controls.screenTime || { enabled: false, dailyLimit: 0, usedToday: 0, remaining: 0 }
    const newRemaining = (screenTime.remaining || 0) + minutes

    screenTime.remaining = newRemaining

    await controls.update({ screenTime }, { transaction })
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "grant_bonus_time", description: "Bonus time granted", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log grant_bonus_time activity:", logError)
    }

    res.status(200).json({
      success: true,
      message: "Bonus time granted",
      newRemaining
    })
  } catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.getParentalControlActivity = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUserId = req.user.id
    const { childUserId } = req.params
    const { deviceId, limit = 10 } = req.query

    const parentMembership = await FamilyMember.findOne({
      where: { userId: loggedInUserId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })
    if (!parentMembership) throw new AppError("Only parents can view activity", 403)

    const familyId = parentMembership.familyId;
    const targetMembership = await FamilyMember.findOne({
      where: { userId: childUserId, familyId },
      attributes: ["userId"],
      transaction
    })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const where = { userId: childUserId };
    if (deviceId) where.deviceId = deviceId

    const activities = await ParentalControlActivity.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      transaction
    })

    await transaction.commit()
    res.status(200).json({ success: true, activities })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})


exports.toggleMonitoring = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id;
    const { childUserId } = req.params;
    const { enabled, deviceId } = req.body;

    const parentMembership = await FamilyMember.findOne({
      where: { userId: loggedInUserId, relationship: "Parent" },
      attributes: ["familyId"],
      transaction
    })
    if (!parentMembership) throw new AppError("Only parents can toggle monitoring", 403)

    const familyId = parentMembership.familyId;
    const targetMembership = await FamilyMember.findOne({
      where: { userId: childUserId, familyId },
      attributes: ["userId"],
      transaction
    })
    if (!targetMembership) throw new AppError("Target user is not in your family", 403)

    const controls = await ParentalControls.findOne({ where: { userId: childUserId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found for this device", 404)

    await controls.update({ isMonitoring: enabled }, { transaction });
    await transaction.commit()

    try {
        await ParentalControlActivity.create({ actingUserId: loggedInUserId, deviceUserId: childUserId, deviceId, type: "toggle_monitoring", description: "Toggled monitoring status", timestamp: new Date() })
    } 
    catch (logError) {
        console.error("Failed to log toggle_monitoring activity:", logError)
    }

    res.status(200).json({ success: true, message: "Monitoring status updated", isMonitoring: enabled })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})


exports.getInstalledApps = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id
    const { deviceId } = req.params
    const { category, search } = req.query

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can view installed apps", 403);

    const familyId = parentMembership.familyId

    const device = await Device.findOne({ where: { id: deviceId }, include: [{ model: User, attributes: ["id"], include: [{ model: FamilyMember, where: { familyId } }] }], transaction })
    if (!device) throw new AppError("Device not found or not in your family", 404)

    let where = { deviceId }
    if (category) where.category = category
    if (search) where.name = { [Op.iLike]: `%${search}%` }

    const apps = await InstalledApp.findAll({ where, transaction })
    const total = await InstalledApp.count({ where, transaction })

    await transaction.commit()
    res.status(200).json({ success: true, apps, total })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})

exports.getParentalControlMembers = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const loggedInUserId = req.user.id

    const parentMembership = await FamilyMember.findOne({ where: { userId: loggedInUserId, relationship: "Parent" }, attributes: ["familyId"], transaction })
    if (!parentMembership) throw new AppError("Only parents can view family members", 403);

    const familyId = parentMembership.familyId
    const members = await FamilyMember.findAll({
      where: { familyId, relationship: "Child" },
      include: [
        {
          model: User,
          attributes: ["id", "userName", "profilePicture"],
          include: [
            {
              model: Device,
              attributes: ["id", "deviceName", "type", "status", "batteryLevel"]
            }
          ]
        }
      ],
      transaction
    })

    const formatted = members.map(m => ({
      userId: m.User.id,
      name: m.User.userName,
      avatar: m.User.profilePicture,
      devices: m.User.Devices.map(d => ({
        deviceId: d.id,
        name: d.deviceName,
        type: d.type,
        status: d.status,
        batteryLevel: d.batteryLevel
      }))
    }))

    await transaction.commit()
    res.status(200).json({ success: true, members: formatted })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error
  }
})


exports.getDeviceStatus = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction()

  try {
    const { id: deviceId, userId } = req.device

    const device = await Device.findOne({ where: { id: deviceId, userId }, include: [{ model: User, attributes: ["id", "role"] }], transaction })
    if (!device) throw new AppError("Device not found", 404)
    if (device.User.role !== "Member") { throw new AppError("Only child devices can call this endpoint", 403) }

    const controls = await ParentalControls.findOne({ where: { userId, deviceId }, transaction })
    if (!controls) throw new AppError("Parental controls not found", 404)

    const activities = await ParentalControlActivity.findAll({ where: { userId, deviceId }, order: [["createdAt", "DESC"]], limit: 10, transaction })

    await transaction.commit()
    res.status(200).json({
      success: true,
      controls: {
        userId: controls.userId,
        deviceId: controls.deviceId,
        isMonitoring: controls.isMonitoring,
        screenTimeLimit: controls.screenTime,
        appBlocking: {
          enabled: controls.appBlocking?.enabled,
          categoryBlocked: controls.appBlocking?.categoryBlocked || []
        },
        webFiltering: {
          enabled: controls.webFiltering?.enabled,
          blockedSites: controls.webFiltering?.blockedSites || []
        },
        bedtime: controls.bedtime,
        quickPause: {
          isDeviceFrozen: controls.quickPause?.isDeviceFrozen,
          frozenAt: controls.quickPause?.frozenAt
        }
      },
      activities: activities.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        app: a.app,
        status: a.status,
        url: a.url,
        timestamp: a.createdAt
      }))
    })
  } 
  catch (error) {
    if (!transaction.finished) await transaction.rollback()
    throw error
  }
})












