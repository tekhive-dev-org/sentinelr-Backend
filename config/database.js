const { Sequelize } = require('sequelize')

const dbConnection = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        logging: false,
        dialect: 'mysql'
    }
)

module.exports = dbConnection