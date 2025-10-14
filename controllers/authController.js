const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../models/User')

exports.login = async(req, res, next) => {
    try{
        const { email, password } = req.body

        const user = await User.findOne({ where: { email } })
        if(!user){ return res.status(404).json({ message: "User Not Found !" }) }

        const match = await bcrypt.compare(password, user.password)
        if(!match){ return res.status(401).json({ message: "Invalid Password !" }) }

        const token = jwt.sign(
            { userId: user.id, userRole: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )

        res.status(200).json({ token })
    }
    catch(error){
        next(error)
    }
}