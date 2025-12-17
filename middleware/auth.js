const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { Op } = require('sequelize')


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


const requireParent = (req, res, next) => {
  const user = req.user
  if (user.role !== 'Parent') {
    return res.status(403).json({
      message: 'Only parents are allowed to perform this action.'
    });
  }
  next()
}



module.exports = { authenticate, authorizeAdmin, requireParent }
