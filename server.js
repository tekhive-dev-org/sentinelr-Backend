require('dotenv').config()
const app = require('./app')
const { dbConnection } = require('./models')

const PORT = process.env.PORT

;(async() => {
    try{
        await dbConnection.sync({ alter: true })
        app.listen(PORT, () => { console.log( `🚀 Server running on port ${PORT}` ) })
    }
    catch(error){
        console.error('Error Starting Server: ', error)
    }
})()