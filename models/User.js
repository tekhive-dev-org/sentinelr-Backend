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
    role: {
        type: DataTypes.ENUM('Personal', 'Parent', 'Child'),
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