const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
    const Location = dbConnection.define('Location', {
        // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        // deviceId: {
        //     type: DataTypes.UUID,
        //     allowNull: false
        // },

        deviceId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        longitude: DataTypes.FLOAT,
        latitude: DataTypes.FLOAT,
        accuracy: { 
            type: DataTypes.FLOAT,
            allowNull: true 
        }, 
        altitude: { 
            type: DataTypes.FLOAT, 
            allowNull: true 
        }, 
        speed: { 
            type: DataTypes.FLOAT, 
            allowNull: true 
        }, 
        source: { 
            type: DataTypes.STRING, 
            allowNull: true 
        }, 
        address: { 
            type: DataTypes.STRING, 
            allowNull: true 
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        deletedAt: {
            type: DataTypes.DATE
        }
    },
    {
        paranoid: true,
        timestamps: true,

        indexes: [
            { fields: ['deviceId', 'timestamp'] },
            { fields: ['timestamp'] }
        ]
    }
    )

    return Location
}