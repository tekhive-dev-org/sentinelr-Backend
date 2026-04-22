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

    const pool = dbConnection.connectionManager.pool

    pool.on('acquire', (connection) => {
        console.log(`Connection ${connection.processID || ''} 📫A-C-Q-U-I-R-E-D  A-T :📫 ${new Date().toISOString()}`)
    })

    pool.on('release', (connection) => {
        console.log(`Connection ${connection.processID || ''} 🚿R-E-L-E-A-S-E-D  A-T :🚿 ${new Date().toISOString()}`)
    })

    pool.on('destroy', (connection) => {
        console.log(`Connection ${connection.processID || ''} 💥D-E-S-T-R-O-Y-E-D  A-T :💥 ${new Date().toISOString()}`);
    })

    pool.on('connect', (connection) => {
        console.log(`Connection ${connection.processID || ''} 🔌C-O-N-N-E-C-T-E-D !🔌`)
    })

    pool.on('disconnect', (connection) => {
        console.log(`Connection ${connection.processID || ''} ⛓️‍💥D-I-S-C-O-N-N-E-C-T-E-D !⛓️‍💥`)
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