const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const PairingCode = dbConnection.define('PairingCode', {
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  familyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceType: {
    type: DataTypes.ENUM('Phone', 'Tablet', 'Laptop', 'Watch'),
    allowNull: false,
    defaultValue: 'Unknown'
  },
  assignedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paired', 'Expired'),
    allowNull: false,
    defaultValue: 'Pending'
  }
}, { timestamps: true })



module.exports = PairingCode
