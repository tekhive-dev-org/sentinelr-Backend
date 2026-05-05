const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
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

  return GeofenceUser
}