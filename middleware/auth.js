const jwt = require('jsonwebtoken')
const { User, Device } = require('../models')
const { Op } = require('sequelize')
const AppError = require('../utils/AppError')


const authenticate = async (req, res, next) => {
    let token
    try{
        const authHeader = req.headers.authorization
        if(!authHeader || !authHeader.startsWith('Bearer ')){ 
            return res.status(401).json({ message: "Missing Token Or Token Invalid !" }) 
        }
        token = authHeader.split(' ')[1]

        const decodedUser = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findByPk(decodedUser.userId)
        req.user = user
        next()
    }
    catch(error){
        console.error(error)

        if(error instanceof jwt.TokenExpiredError){   // if(error.name === "TokenExpiredError")
            const decoded = jwt.decode(token)
            
            await User.update(
                { otp: null, otpExpiredAt: null },
                {
                    where: {
                        id: decoded.userId,
                        otpExpiredAt: { [Op.lt]: new Date() },
                        verified: false
                    }
                }
            )
        }

        res.status(401).json({ message: "Invalid Or Expired Token !" })
    }
}


const authorizeAdmin = (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


const optionalAuth = async (req, res, next) => {
    let token;

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) { return next() }

        token = authHeader.split(' ')[1]
        const decodedUser = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findByPk(decodedUser.userId)

        if (user) { req.user = user }
    }
    catch (error) { console.warn("OptionalAuth Ignored Token:", error.message) }
    next()
}


const requireParent = (req, res, next) => {
  const user = req.user
  if (user.role !== 'Parent') {
    return next(new AppError('Only parents are allowed to perform this action', 403, 'PARENT_ROLE_REQUIRED'))
  }
  next()
}


const deviceAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Device authentication required', 401, 'DEVICE_AUTH_REQUIRED'))
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.DEVICE_SECRET)
    const device = await Device.findByPk(decoded.deviceId)

    if (!device) {
      return next(new AppError('Device not found', 401, 'DEVICE_NOT_FOUND'))
    }

    if (!device.pairedAt) {
      return next(new AppError('Device not paired', 403,'DEVICE_NOT_PAIRED'))
    }

    req.device = device
    next()
  } 
  catch (err) {
    return next(new AppError('Invalid or expired device token', 401, 'DEVICE_AUTH_INVALID'))
  }
}




module.exports = { authenticate, authorizeAdmin, requireParent, optionalAuth, deviceAuth }
