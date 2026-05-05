const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
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

    return FamilyMember
}