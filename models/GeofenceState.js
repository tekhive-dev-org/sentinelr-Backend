const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const GeofenceState = dbConnection.define( "GeofenceState", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      deviceId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      geofenceId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      inside: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: "GeofenceStates",

      indexes: [
        { fields: ["deviceId"] },
        { fields: ["geofenceId"] },
        {
          unique: true,
          fields: ["deviceId", "geofenceId"]
        }
      ]
    }
)

module.exports =  GeofenceState
