const { Sequelize } = require('sequelize')


let dbConnection;

if (process.env.NODE_ENV === "production") {
    dbConnection = new Sequelize(process.env.DB_URL, {
        dialect: "postgres",
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    })
} 
else {
    dbConnection = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            logging: console.log,
            // logging: false,
            // dialect: 'mysql'
            // url: process.env.DATABASE_URL
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres'
        }
    )
}

module.exports = dbConnection