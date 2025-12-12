const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const Device = dbConnection.define('Device',{
    deviceName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    deletedAt: {
        type: DataTypes.DATE
    }
},
{
    paranoid: true,
    timestamps: true,
    // deletedAt: 'deletedAt'
}
)

module.exports = Device