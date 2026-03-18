const { Geofence, GeofenceState, User } = require('../models')
const { distanceMeters } = require('../utils/geoDistance')


const saveState = async (deviceId, geofenceId, inside) => {
  const state = await GeofenceState.findOne({ where: { deviceId, geofenceId } })

  if (state) {
    state.inside = inside
    await state.save()
  } 
  else { await GeofenceState.create({ deviceId, geofenceId, inside }) }
}

const createGeofenceEvent = async (deviceId, geofenceId, eventType, latitude, longitude) => {
  await GeofenceEvent.create({ deviceId, geofenceId, eventType, latitude, longitude })
}

exports.checkGeofences = async (device, latitude, longitude) => {
  const userId = device.userId

  const geofences = await Geofence.findAll({
    include: [{ model: User, where: { id: userId }, attributes: [], through: { attributes: [] } }], where: { isActive: true } })

  for (const g of geofences) {
    const distance = distanceMeters(latitude, longitude, g.centerLatitude, g.centerLongitude)
    const inside = distance <= g.radius

    const prevState = await GeofenceState.findOne({ where: { deviceId: device.id, geofenceId: g.id } })

    const wasInside = prevState?.inside || false
    if (!wasInside && inside) {

      if (g.notifyOnEntry) {
        await createGeofenceEvent(
          device.id,
          g.id,
          "ENTER",
          latitude,
          longitude
        )
      }

      await saveState(device.id, g.id, true)
    }

    if (wasInside && !inside) {
      if (g.notifyOnExit) {
        await createGeofenceEvent(
          device.id,
          g.id,
          "EXIT",
          latitude,
          longitude
        )
      }

      await saveState(device.id, g.id, false)
    }
  }
}