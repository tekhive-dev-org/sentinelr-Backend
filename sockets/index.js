const { Location } = require('../models')

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A User Connected: ', socket.id)

    // Example custom events
    // socket.on('chat message', (msg) => {
    //   console.log(`Message from ${socket.id}: ${msg}`)
    //   // Broadcast to everyone else
    //   socket.broadcast.emit('chat message', msg)
    // })

    socket.on('deviceLocationUpdate', async (data) => {
      try {
        const { deviceId, latitude, longitude } = data

        await Location.create({
          deviceId,
          latitude,
          longitude,
          timestamp: new Date()
        })

        // Broadcast to all map clients (Admin Dashboard Map)
        io.emit('deviceLocationUpdate', data)
      } catch (err) {
        console.error('Error saving location:', err)
      }
    })

    socket.on('disconnect', () => {
      console.log('A User Disconnected:', socket.id)
    })
  })
}
