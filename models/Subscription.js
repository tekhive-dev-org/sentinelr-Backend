const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Subscription = dbConnection.define('Subscription', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  planId: {
    type: DataTypes.INTEGER,
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
  },
  paymentReference: {
    type: DataTypes.STRING
  },
  deletedAt: {
    type: DataTypes.DATE
  }
},
{
    paranoid: true,
    timestamps: true,
    // deletedAt: 'deletedAt'
}
)

const Plan = dbConnection.define('Plan', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  deviceLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
})

module.exports = { Subscription, Plan }