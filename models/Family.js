const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
    const Family = dbConnection.define('Family',{
        // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

        familyName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        maxMembers:{
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2
        },
        deletedAt: {
            type: DataTypes.DATE
        }
    },
    {
        paranoid: true,
        timestamps: true,
        indexes: [
            { fields: ['createdBy'] }
        ]
        // deletedAt: 'deletedAt'
    }
    )

    return Family
}