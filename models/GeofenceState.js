const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const GeofenceState = dbConnection.define( "GeofenceState", {
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

  return GeofenceState
}
