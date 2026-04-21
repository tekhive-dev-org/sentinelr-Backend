const { Sequelize } = require('sequelize')


let dbConnection;

if (process.env.NODE_ENV === "production") {
    dbConnection = new Sequelize(process.env.DB_URL, {
        dialect: "postgres",
        logging: console.log,
        dialectOptions: {
            statement_timeout: 0,
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: false
        // pool: {
        //     max: 5,    // switched from 10 to 5, so render doesnt hit Supabase's limits quickly
        //     min: 0,
        //     acquire: 60000,     // switch from 30000 to 60000, to wait longer
        //     idle: 10000
        // }
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