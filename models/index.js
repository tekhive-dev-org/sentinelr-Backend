const dbConnection = require('../config/database')
const User = require('./User')
const Family = require('./Family')
const FamilyMember = require('./FamilyMember')
const Device = require('./Device')
const Location = require('./Location')

User.hasMany(Device, { foreignKey: 'userId' })
Device.belongsTo(User, { foreignKey: 'userId' })

Device.hasMany(Location, { foreignKey: 'deviceId' })
Location.belongsTo(Device, { foreignKey: 'deviceId' })

Family.belongsTo(User, { as:'creator', foreignKey: 'createdBy' })

Family.belongsToMany(User, { foreignKey: 'familyId', as: 'members', through: FamilyMember })
User.belongsToMany(Family, { foreignKey: 'userId', as: 'families', through: FamilyMember })

module.exports = { dbConnection, User, Family, FamilyMember, Device, Location }