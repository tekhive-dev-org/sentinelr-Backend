const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Location = dbConnection.define('Location', {
    longitude: DataTypes.FLOAT,
    latitude: DataTypes.FLOAT,
    deviceId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
})

module.exports = Location