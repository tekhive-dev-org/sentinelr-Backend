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
        type: DataTypes.ENUM('Phone', 'Tablet', 'Laptop', 'Watch'),
        allowNull: false
    },

    platform: {
        type: DataTypes.ENUM('IOS', 'Android'),
        allowNull: true
    },

    deviceModel: {
        type: DataTypes.STRING,
        allowNull: true
    },

    brand: {
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
        type: DataTypes.ENUM('Online', 'Offline', 'Remove'),
        allowNull: false,
        defaultValue: 'Offline'
    },

    pairStatus: {
        type: DataTypes.ENUM('Pending', 'Paired', 'Expired'),
        allowNull: false,
        defaultValue: 'Pending'
    },

    batteryLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0, max: 100 }
    },

    isCharging: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    networkType: {
        type: DataTypes.ENUM('Cellular', 'Wifi', 'None'),
        allowNull: false,
        defaultValue: 'None'
    },

    lastLatitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    lastLongitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    locationAccuracy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    locationTimestamp: {
        type: DataTypes.DATE,
        allowNull: true
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
        { unique: true, fields: ['userId'], where: { deletedAt: null } },
        { fields: ['status'] },
        { fields: ['lastSeen'] }
    ]
})

module.exports = Device