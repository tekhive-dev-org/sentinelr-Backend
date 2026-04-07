const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Subscription = dbConnection.define('Subscription', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  planId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'),
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
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'annual'),
    defaultValue: 'monthly'
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'NGN'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cancelReason: DataTypes.STRING,
  cancelFeedback: DataTypes.TEXT,
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  paymentMeta: DataTypes.JSONB,
  authorizationCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentChannel: DataTypes.STRING,
  paymentBank: DataTypes.STRING,
  paymentCardType: DataTypes.STRING,
  paymentLast4: DataTypes.STRING,
  paymentExpMonth: DataTypes.STRING,
  paymentExpYear: DataTypes.STRING,
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
  slug: {
    type: DataTypes.STRING,
    unique: true,
    // primaryKey: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  annualPrice: DataTypes.FLOAT,
  monthlyPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'NGN'
  },
  trialDays: DataTypes.INTEGER,
  isCustomPricing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  description: DataTypes.TEXT,
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  maxDevices: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
})

module.exports = { Subscription, Plan }