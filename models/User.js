const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')
const bcrypt = require('bcrypt')

const User = dbConnection.define('User', {
    userName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: { isEmail: true }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    otpExpiredAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    profilePicture: {
        type: DataTypes.STRING,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('Personal', 'Parent', 'Child', 'Admin', 'SuperAdmin'),
        defaultValue: 'Personal',
        allowNull: false
    }
}, 
{
    hooks: {
        beforeCreate: async (user) => {
            user.password = await bcrypt.hash(user.password, 10)
        }
    }
})

module.exports = User