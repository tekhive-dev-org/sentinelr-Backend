const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Device = dbConnection.define('Device', {
    deviceName: {
        type: DataTypes.STRING,
        allowNull: false
    },

    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    type: {
        type: DataTypes.ENUM('phone', 'tablet', 'laptop', 'watch'),
        allowNull: false
    },

    platform: {
        type: DataTypes.ENUM('ios', 'android'),
        allowNull: false
    },

    deviceModel: {
        type: DataTypes.STRING,
        allowNull: true
    },

    osVersion: {
        type: DataTypes.STRING,
        allowNull: true
    },

    appVersion: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Sentinelr_v1'
    },

    uploadToken: {
        type: DataTypes.STRING,
        allowNull: true
    },

    pushToken: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },

    status: {
        type: DataTypes.ENUM('online', 'offline'),
        allowNull: false,
        defaultValue: 'offline'
    },

    batteryLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
        min: 0,
        max: 100
        }
    },

    isCharging: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    networkType: {
        type: DataTypes.ENUM('cellular', 'wifi', 'none'),
        allowNull: false,
        defaultValue: 'none'
    },

    pairedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },

    lastSeen: {
        type: DataTypes.DATE,
        allowNull: true
    },

    deletedAt: {
        type: DataTypes.DATE
    }
}, 
{
    paranoid: true,
    timestamps: true,

    indexes: [
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['lastSeen'] }
    ]
})

module.exports = Device