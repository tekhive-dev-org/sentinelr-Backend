const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const GeofenceEvent = dbConnection.define("GeofenceEvent", {
        // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        // deviceId: {
        //   type: DataTypes.UUID,
        //   allowNull: false
        // },
        // geofenceId: {
        //   type: DataTypes.UUID,
        //   allowNull: false
        // },

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
