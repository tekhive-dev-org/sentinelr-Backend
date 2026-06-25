const { DataTypes } = require('sequelize')


module.exports = (dbConnection) => {
  const PairingCode = dbConnection.define('PairingCode', {
    // id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // deviceId: {
    //   type: DataTypes.UUID,
    //   allowNull: true
    // },
    // familyId: {
    //   type: DataTypes.UUID,
    //   allowNull: false
    // },

    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    familyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deviceType: {
      type: DataTypes.ENUM('Phone', 'Tablet', 'Laptop', 'Watch', 'Unknown'),
      allowNull: false,
      defaultValue: 'Unknown'
    },
    platform: {
      type: DataTypes.ENUM('IOS', 'Android'),
      allowNull: true
    },
    assignedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Paired', 'Expired'),
      allowNull: false,
      defaultValue: 'Pending'
    }
  }, 
  { 
    timestamps: true,

    indexes:[
      { fields: ['code', 'status'] },
    ]
  })



  return PairingCode
}
