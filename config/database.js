const { Sequelize } = require('sequelize')

const dbConnection = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        logging: false,
        // dialect: 'mysql'
        // url: process.env.DATABASE_URL
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres'
    }
)

module.exports = dbConnection