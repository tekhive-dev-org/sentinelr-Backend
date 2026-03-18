const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const Geofence = dbConnection.define( "Geofence", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      familyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM("safe_zone", "danger_zone"),
        defaultValue: "safe_zone"
      },
      centerLatitude: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      centerLongitude: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      radius: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      address: DataTypes.STRING,
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      notifyOnEntry: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      notifyOnExit: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      scheduleEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      scheduleDays: {
        type: DataTypes.JSON
      },
      scheduleStartTime: {
        type: DataTypes.TIME
      },
      scheduleEndTime: {
        type: DataTypes.TIME
      }
    },
    {
      tableName: "Geofences",
      paranoid: true,
      timestamps: true,

      indexes: [
        { fields: ["familyId"] },
        { fields: ["centerLatitude", "centerLongitude"] }
      ]
    }
)

module.exports =  Geofence
