const { Sequelize } = require('sequelize')


let dbConnection;

if (process.env.NODE_ENV === "production") {
    dbConnection = new Sequelize(process.env.DB_URL, {
        dialect: "postgres",
        logging: (msg) => console.log(`[Sequelize] ${msg}`),
        dialectOptions: {
            statement_timeout: 0,
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 2,    // switched from 10 to 5, then from 5 to 2, so render doesnt hit Supabase's limits quickly
            min: 0,
            acquire: 60000,     // switch from 30000 to 60000, to wait longer
            idle: 3000        // switch from 10000 to 3000, to keep idle connections alive longer
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