const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {

    const authorization = req.headers.authorization
    if(!authorization){ return res.status(401).json({ message: "Missing Token !" }) }
    const token = authorization.split(' ')[1]

    try{
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET)
        req.user = verifiedUser
        next()
    }
    catch(error){
        res.status(401).json({ message: "Invalid Or Expired Token !" })
    }
}