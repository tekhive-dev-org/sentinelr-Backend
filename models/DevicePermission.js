const { DataTypes } = require('sequelize')
const dbConnection = require('../config/database')


const DevicePermission = dbConnection.define('DevicePermission', {
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  backgroundLocation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  motionActivity: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
})



// const DevicePermission = dbConnection.define('DevicePermission', {
//   deviceId: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },

//   key: {
//     type: DataTypes.STRING,
//     allowNull: false
//     // examples:
//     // location
//     // background_location
//     // notifications
//     // motion_activity
//   },

//   granted: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   }
// }, {
//   timestamps: true,
//   indexes: [
//     {
//       unique: true,
//       fields: ['deviceId', 'key']
//     }
//   ]
// })



module.exports = DevicePermission
