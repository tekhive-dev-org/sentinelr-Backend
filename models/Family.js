const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const Family = dbConnection.define('Family',{
    familyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createdBy: {
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

module.exports = Family