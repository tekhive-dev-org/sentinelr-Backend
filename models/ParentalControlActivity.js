const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const ParentalControlActivity = dbConnection.define('ParentalControlActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  actingUserId: { type: DataTypes.INTEGER, allowNull: false },
  deviceUserId: { type: DataTypes.INTEGER, allowNull: false },
  deviceId: { type: DataTypes.STRING, allowNull: false },

  type: { type: DataTypes.STRING, allowNull: false }, 

  description: { type: DataTypes.STRING },
  app: { type: DataTypes.STRING },
  url: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },

  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, 
{
  timestamps: true,
  paranoid: true
}
)

module.exports = ParentalControlActivity
