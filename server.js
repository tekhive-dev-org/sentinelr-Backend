require('dotenv').config()
const server = require('./app')
const { dbConnection } = require('./models')
const authController = require('./controllers/authController')

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')

const PORT = process.env.PORT

async function connectWithRetry(retries = 5) {
  while (retries) {
    try {
      await dbConnection.authenticate()
      console.log('✅ Database connected')
      return
    } 
    catch (err) {
      retries--
      console.error(`❌ DB connection failed. Retries left: ${retries}`)
      console.error(err.message)
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  throw new Error('Could not connect to database after retries')
}

;(async() => {
    try{
        await connectWithRetry()

        await authController.createFirstSuperAdmin()
        server.listen(PORT, () => { console.log( `🚀 Server running on port ${PORT}` ) })
    }
    catch(error){
        console.error('Error Starting Server: ', error)
        process.exit(1)
    }
})()