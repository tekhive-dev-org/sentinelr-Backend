const dbConnection = require('../config/database')
const User = require('./User')
const Family = require('./Family')
const FamilyMember = require('./FamilyMember')
const Device = require('./Device')
const Location = require('./Location')
const { Subscription, Plan } = require('./Subscription')
const PairingCode = require('./PairingCode')
const Geofence = require('./Geofence')
const GeofenceUser = require('./GeofenceUser')
const GeofenceState = require('./GeofenceState')
const GeofenceEvent = require('./GeofenceEvent')


User.hasMany(Device, { foreignKey: 'userId', onDelete: 'CASCADE' })
Device.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' })

Device.hasMany(Location, { foreignKey: 'deviceId', onDelete: 'CASCADE' })
Location.belongsTo(Device, { foreignKey: 'deviceId', onDelete: 'CASCADE' })

User.hasMany(Subscription, { foreignKey: 'userId', onDelete: 'CASCADE' })
Subscription.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' })

Family.belongsTo(User, { as:'creator', foreignKey: 'createdBy', onDelete: 'CASCADE' })

Family.belongsToMany(User, { foreignKey: 'familyId', as: 'members', through: FamilyMember, onDelete: 'CASCADE' })
User.belongsToMany(Family, { foreignKey: 'userId', as: 'families', through: FamilyMember, onDelete: 'CASCADE' })

Family.hasMany(PairingCode, { foreignKey: 'familyId', onDelete: 'CASCADE' });
PairingCode.belongsTo(Family, { foreignKey: 'familyId' })

PairingCode.belongsTo(Device, { foreignKey: 'deviceId', onDelete: 'CASCADE' })
Device.hasOne(PairingCode, { foreignKey: 'deviceId' })

Family.hasMany(Geofence, { foreignKey: 'familyId', onDelete: 'CASCADE' })
Geofence.belongsTo(Family, { foreignKey: 'familyId' })

Geofence.belongsToMany(User, { through: GeofenceUser, foreignKey: 'geofenceId', otherKey: 'userId', onDelete: 'CASCADE' })
User.belongsToMany(Geofence, { through: GeofenceUser, foreignKey: 'userId', otherKey: 'geofenceId', onDelete: 'CASCADE' })

Device.hasMany(GeofenceState, { foreignKey: 'deviceId', onDelete: 'CASCADE' })
GeofenceState.belongsTo(Device, { foreignKey: 'deviceId' })

Geofence.hasMany(GeofenceState, { foreignKey: 'geofenceId', onDelete: 'CASCADE' })
GeofenceState.belongsTo(Geofence, { foreignKey: 'geofenceId' })

Device.hasMany(GeofenceEvent, { foreignKey: 'deviceId', onDelete: 'CASCADE' })
GeofenceEvent.belongsTo(Device, { foreignKey: 'deviceId' })

Geofence.hasMany(GeofenceEvent, { foreignKey: 'geofenceId', onDelete: 'CASCADE' })
GeofenceEvent.belongsTo(Geofence, { foreignKey: 'geofenceId' })

Plan.hasMany(Subscription, { foreignKey: 'planId', sourceKey: 'slug' })
Subscription.belongsTo(Plan, { foreignKey: 'planId', targetKey: 'slug' })



module.exports = { dbConnection, User, Family, FamilyMember, Device, Location, Subscription, Plan, PairingCode, Geofence, GeofenceUser, GeofenceEvent }