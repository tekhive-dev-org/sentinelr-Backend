const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')

const GeofenceUser = dbConnection.define("GeofenceUser", {
      geofenceId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: "GeofenceUsers",

      indexes: [
        { fields: ["geofenceId"] },
        { fields: ["userId"] },
        {
          unique: true,
          fields: ["geofenceId", "userId"]
        }
      ]
    }
)

module.exports = GeofenceUser