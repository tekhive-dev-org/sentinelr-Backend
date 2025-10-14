const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const FamilyMember = dbConnection.define('FamilyMember',{
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    familyId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    relationship: {
        type: DataTypes.ENUM('Parent', 'Child'),
        allowNull: false
    }
}
)

module.exports = FamilyMember