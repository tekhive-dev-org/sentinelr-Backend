const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const GeofenceUser = dbConnection.define("GeofenceUser", {
    // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // geofenceId: {
    //   type: DataTypes.UUID,
    //   allowNull: false
    // },
    // userId: {
    //   type: DataTypes.UUID,
    //   allowNull: false
    // }

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