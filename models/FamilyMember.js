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
    deletedAt: {
        type: DataTypes.DATE
    }
},
{
    paranoid: true,
    timestamps: true,
    indexes: [
        { fields: ['familyId'] },
        { fields: ['userId'] },
        { fields: ['relationship'] },
        {
            unique: true,
            fields: ['familyId', 'userId'],
            where: {
                deletedAt: null
            }
        }
    ]
}
)

module.exports = FamilyMember