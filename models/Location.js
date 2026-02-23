const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const Location = dbConnection.define('Location', {
    longitude: DataTypes.FLOAT,
    latitude: DataTypes.FLOAT,
    accuracy: { 
        type: DataTypes.FLOAT,
        allowNull: true 
    }, 
    altitude: { 
        type: DataTypes.FLOAT, 
        allowNull: true 
    }, 
    speed: { 
        type: DataTypes.FLOAT, 
        allowNull: true 
    }, 
    source: { 
        type: DataTypes.STRING, 
        allowNull: true 
    }, 
    address: { 
        type: DataTypes.STRING, 
        allowNull: true 
    },
    deviceId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    deletedAt: {
        type: DataTypes.DATE
    }
},
{
    paranoid: true,
    timestamps: true,

    indexes: [
        { fields: ['deviceId', 'timestamp'] },
        { fields: ['timestamp'] }
    ]
}
)

module.exports = Location