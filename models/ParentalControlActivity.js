const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const ParentalControlActivity = dbConnection.define('ParentalControlActivity', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    actingUserId: { type: DataTypes.INTEGER, allowNull: false },
    deviceUserId: { type: DataTypes.INTEGER, allowNull: false },
    deviceId: { type: DataTypes.INTEGER, allowNull: false },

    type: { type: DataTypes.STRING, allowNull: false }, 

    description: { type: DataTypes.STRING },
    app: { type: DataTypes.STRING },
    url: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },

    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, 
    {
      timestamps: true,
      paranoid: true
    }
    )

    return ParentalControlActivity
}
