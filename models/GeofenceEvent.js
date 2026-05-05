const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const GeofenceEvent = dbConnection.define("GeofenceEvent", {
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
        eventType: {
          type: DataTypes.ENUM("ENTER", "EXIT"),
          allowNull: false
        },
        latitude: {
          type: DataTypes.FLOAT
        },

        longitude: {
          type: DataTypes.FLOAT
        }
      },
      {
        tableName: "GeofenceEvents",

        indexes: [
          { fields: ["deviceId"] },
          { fields: ["geofenceId"] },
          { fields: ["eventType"] },
          { fields: ["createdAt"] }
        ]
      }
  )

  return GeofenceEvent
}
