const dbConnection = require('../config/database')
const User = require('./User')
const Family = require('./Family')
const FamilyMember = require('./FamilyMember')
const Device = require('./Device')
const Location = require('./Location')
const Subscription = require('./Subscription')
const PairingCode = require('./PairingCode')
const DevicePermission = require('./DevicePermission')


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

Device.hasMany(DevicePermission, { foreignKey: 'deviceId', onDelete: 'CASCADE' });
DevicePermission.belongsTo(Device, { foreignKey: 'deviceId' })


module.exports = { dbConnection, User, Family, FamilyMember, Device, Location, Subscription, DevicePermission, PairingCode }