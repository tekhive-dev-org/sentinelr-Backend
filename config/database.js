const { Sequelize } = require('sequelize')


let dbConnection;

if (process.env.NODE_ENV === "production") {
    dbConnection = new Sequelize(process.env.DB_URL, {
        dialect: "postgres",
        logging: (msg) => console.log(`[Sequelize] ${msg}`),
        dialectOptions: {
            keepAlive: true,
            statement_timeout: 0,
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 10,    // switched from 10 to 5, then from 5 to 2, so render doesnt hit Supabase's limits quickly
            min: 0,
            acquire: 30000,     // switch from 30000 to 60000, to wait longer
            idle: 10000,        // switch from 10000 to 3000, to keep idle connections alive longer
            evict: 10000
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

setInterval(async () => {
  try {
    await dbConnection.query('SELECT 1')
  } catch (err) {
    console.error('❌ DB ping failed:', err.message)
  }
}, 120000)



module.exports = dbConnection