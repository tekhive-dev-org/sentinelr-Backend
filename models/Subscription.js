const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Subscription = dbConnection.define('Subscription', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('person', 'familyOf5', 'familyOf10'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'renewed'),
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
})

module.exports = Subscription