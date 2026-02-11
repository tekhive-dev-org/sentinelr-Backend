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
        type: DataTypes.ENUM('Parent', 'Member'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Not_Paired', 'Active', 'Paused'),
        allowNull: false,
        defaultValue: 'Not_Paired'
    },
    deletedAt: {
        type: DataTypes.DATE
    }
},
{
    paranoid: true,
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['familyId', 'userId'],
            where: {
                deletedAt: null
            }
        }
    ]
    // deletedAt: 'deletedAt'
}
)

module.exports = FamilyMember