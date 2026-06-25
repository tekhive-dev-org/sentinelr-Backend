const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
    const FamilyMember = dbConnection.define('FamilyMember',{
        // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

        // userId: {
        //     type: DataTypes.UUID,
        //     allowNull: false
        // },
        // familyId: {
        //     type: DataTypes.UUID,
        //     allowNull: false
        // },

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
            },
            { fields: ['familyId', 'userId'] }
        ]
    }
    )

    return FamilyMember
}