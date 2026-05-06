const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
    const Alert = dbConnection.define('Alert', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // deviceId: { type: DataTypes.UUID, allowNull: false },
    // userId: { type: DataTypes.UUID, allowNull: false },
    deviceId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },

    type: { 
        type: DataTypes.ENUM("sos", "intruder", "geofence", "screen_time"), 
        allowNull: false 
    },

    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },

    status: { 
        type: DataTypes.ENUM("active", "resolved", "cancelled"), 
        defaultValue: "active" 
    },

    priority: { 
        type: DataTypes.ENUM("low", "medium", "high"), 
        defaultValue: "medium" 
    },

    location: { type: DataTypes.JSONB }, 

    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    resolvedAt: { type: DataTypes.DATE }
    }, 
    {
    timestamps: true,
    paranoid: true
    })

    return Alert
}