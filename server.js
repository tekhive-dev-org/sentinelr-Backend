require('dotenv').config()
const server = require('./app')
const { dbConnection } = require('./models')
const authController = require('./controllers/authController')


const PORT = process.env.PORT

;(async() => {
    try{
        await dbConnection.sync({ alter: true })
        await authController.createFirstSuperAdmin()
        server.listen(PORT, () => { console.log( `🚀 Server running on port ${PORT}` ) })
    }
    catch(error){
        console.error('Error Starting Server: ', error)
    }
})()