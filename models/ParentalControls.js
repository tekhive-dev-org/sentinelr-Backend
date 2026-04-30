const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const ParentalControls = dbConnection.define('ParentalControls', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },

  isMonitoring: { type: DataTypes.BOOLEAN, defaultValue: false },

  screenTime: { type: DataTypes.JSONB }, 
  // { enabled, dailyLimit, usedToday, remaining, breakdown, schedule }

  appBlocking: { type: DataTypes.JSONB }, 
  // { enabled, blockedApps: [], categoryBlocked: [], appOverrides: [] }

  webFiltering: { type: DataTypes.JSONB }, 
  // { enabled, blockedSites: [], safeSearchEnabled, categoryBlocked: [] }

  bedtime: { type: DataTypes.JSONB }, 
  // { enabled, startTime, endTime }

  quickPause: { type: DataTypes.JSONB }, 
  // { isDeviceFrozen, frozenAt, frozenUntil }
}, 
{
  paranoid: true,
  timestamps: true
})

module.exports = ParentalControls
